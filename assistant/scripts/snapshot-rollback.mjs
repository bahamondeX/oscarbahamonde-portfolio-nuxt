// Default is an offline plan. Capture writes potentially sensitive configuration only
// into a new mode-0700 OS temporary directory, never into the repository.
import { execFileSync } from 'node:child_process'
import { mkdtemp, chmod, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { parse } from 'yaml'

const mode = process.argv[2] || '--plan'
const region = process.env.AWS_REGION || 'us-east-1'
const stack = process.env.ASSISTANT_STACK || 'oscar-assistant'
if (!/^[a-z][a-z0-9-]{2,40}$/.test(stack)) throw Error('Invalid stack name')
const aws = args => {
  try {
    return JSON.parse(execFileSync('aws', [...args, '--region', region, '--output', 'json', '--no-cli-pager'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }))
  } catch { throw Error(`AWS ${args[0]} ${args[1]} failed; no response, configuration or signed URL printed`) }
}
const writePrivate = async (path, value) => { await writeFile(path, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2), { mode: 0o600 }); await chmod(path, 0o600) }
if (mode === '--plan') {
  console.log(JSON.stringify({ stack, region, awsCalls: 0, stages: [
    '--capture: read stack/template/parameters, current Lambda configurations, aliases, URLs and download private ZIP backups; publish immutable versions with revision/hash preconditions',
    '--prepare <snapshot-directory>: create a CloudFormation UPDATE change set from the captured SAM template and parameter values; do not execute it',
    'Review replacements/deletions and execute only the intended code/config rollback; verify hashes, URL binding and acceptance tests afterward',
  ] }, null, 2))
} else if (mode === '--capture') {
  const identity = aws(['sts', 'get-caller-identity'])
  const current = aws(['cloudformation', 'describe-stacks', '--stack-name', stack]).Stacks[0]
  if (!['CREATE_COMPLETE', 'UPDATE_COMPLETE', 'UPDATE_ROLLBACK_COMPLETE'].includes(current.StackStatus)) throw Error('Stack must be stable before capture')
  const original = aws(['cloudformation', 'get-template', '--stack-name', stack, '--template-stage', 'Original']).TemplateBody
  const template = typeof original === 'string' ? parse(original) : original
  const resources = aws(['cloudformation', 'list-stack-resources', '--stack-name', stack]).StackResourceSummaries.filter(x => x.ResourceType === 'AWS::Lambda::Function')
  const dir = await mkdtemp(join(tmpdir(), 'oscar-assistant-rollback-')); await chmod(dir, 0o700)
  await writePrivate(join(dir, 'template.json'), JSON.stringify(template))
  const parameters = current.Parameters.map(p => {
    if (p.ParameterValue === '****') throw Error('Masked parameter cannot be snapshotted safely; retain its previous value during rollback')
    return { ParameterKey: p.ParameterKey, ParameterValue: p.ParameterValue }
  })
  await writePrivate(join(dir, 'parameters.json'), parameters)
  const snapshot = { capturedAt: new Date().toISOString(), account: identity.Account, region, stack, stackId: current.StackId, functions: [], complete: false }
  await writePrivate(join(dir, 'snapshot.json'), snapshot)
  for (const resource of resources) {
    const name = resource.PhysicalResourceId
    const fn = aws(['lambda', 'get-function', '--function-name', name])
    if (fn.Configuration.PackageType !== 'Zip' || !fn.Code.Location) throw Error('Only existing ZIP Lambdas are supported')
    const response = await fetch(fn.Code.Location)
    if (!response.ok) throw Error('Private Lambda ZIP download failed')
    const zip = Buffer.from(await response.arrayBuffer())
    if (createHash('sha256').update(zip).digest('base64') !== fn.Configuration.CodeSha256) throw Error('ZIP hash mismatch; abort capture')
    const archive = resource.LogicalResourceId + '.zip'
    await writePrivate(join(dir, archive), zip)
    const aliases = aws(['lambda', 'list-aliases', '--function-name', name]).Aliases
    // List includes FunctionArn, with qualifier when bound to an alias; an alias existing
    // does not mean that the public URL invokes it.
    const urls = aws(['lambda', 'list-function-url-configs', '--function-name', name]).FunctionUrlConfigs
    const settings = ['CodeSha256','Runtime','Handler','Role','MemorySize','Timeout','Environment','Layers','Architectures','KMSKeyArn','VpcConfig','FileSystemConfigs','DeadLetterConfig','TracingConfig','EphemeralStorage','SnapStart','LoggingConfig']
    const canonical = value => JSON.stringify(value, function (_, item) { return item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a],[b]) => a.localeCompare(b))) : item })
    const configurationKey = config => canonical(Object.fromEntries(settings.map(key => [key, config[key]])))
    const versions = aws(['lambda', 'list-versions-by-function', '--function-name', name]).Versions
    const existing = versions.find(v => v.Version !== '$LATEST' && configurationKey(v) === configurationKey(fn.Configuration))
    const published = existing || aws(['lambda', 'publish-version', '--function-name', name, '--code-sha256', fn.Configuration.CodeSha256, '--revision-id', fn.Configuration.RevisionId, '--description', 'Pre-deployment rollback snapshot'])
    snapshot.functions.push({ logicalId: resource.LogicalResourceId, name, archive, sha256: fn.Configuration.CodeSha256, version: published.Version, versionArn: published.FunctionArn, configuration: fn.Configuration, aliases, urls })
    await writePrivate(join(dir, 'snapshot.json'), snapshot)
  }
  snapshot.complete = true; await writePrivate(join(dir, 'snapshot.json'), snapshot)
  console.log(JSON.stringify({ snapshotDirectory: dir, functions: snapshot.functions.length, complete: true, secretsPrinted: false }))
} else if (mode === '--prepare') {
  if (!process.argv[3]) throw Error('Provide the private snapshot directory')
  const dir = resolve(process.argv[3]), snapshot = JSON.parse(await readFile(join(dir, 'snapshot.json'), 'utf8'))
  const identity = aws(['sts', 'get-caller-identity'])
  if (!snapshot.complete || snapshot.account !== identity.Account || snapshot.stack !== stack || snapshot.region !== region) throw Error('Snapshot incomplete or target mismatch')
  const current = aws(['cloudformation', 'describe-stacks', '--stack-name', stack]).Stacks[0]
  if (current.StackId !== snapshot.stackId) throw Error('Stack identity changed; abort rollback')
  const templateBody = await readFile(join(dir, 'template.json'), 'utf8')
  if (Buffer.byteLength(templateBody) > 51200) throw Error('Captured template exceeds direct CloudFormation limit. Upload it privately to the existing artifact bucket and use TemplateURL; do not truncate it.')
  const template = JSON.parse(templateBody), checked = new Set()
  for (const resource of Object.values(template.Resources || {})) {
    if (resource.Type !== 'AWS::Serverless::Function') continue
    const uri = resource.Properties?.CodeUri
    let bucket, key, version
    if (typeof uri === 'string' && uri.startsWith('s3://')) { const url = new URL(uri); bucket = url.hostname; key = url.pathname.slice(1) }
    else if (uri && typeof uri.Bucket === 'string' && typeof uri.Key === 'string') { bucket = uri.Bucket; key = uri.Key; version = uri.Version }
    else throw Error('Snapshot must contain packaged S3 CodeUri references; local or unresolved paths cannot roll back')
    const identity = JSON.stringify([bucket,key,version])
    if (!checked.has(identity)) { aws(['s3api', 'head-object', '--bucket', bucket, '--key', key, ...(version ? ['--version-id', version] : [])]); checked.add(identity) }
  }
  const changeSet = `rollback-${Date.now()}`
  // No mutation of Lambda code/config, URL, aliases, DNS or traffic occurs here.
  const prepared = aws(['cloudformation', 'create-change-set', '--stack-name', stack, '--change-set-name', changeSet, '--change-set-type', 'UPDATE', '--template-body', 'file://' + join(dir, 'template.json'), '--parameters', 'file://' + join(dir, 'parameters.json'), '--capabilities', 'CAPABILITY_IAM', 'CAPABILITY_AUTO_EXPAND'])
  await writePrivate(join(dir, 'rollback-change-set.json'), prepared)
  console.log(JSON.stringify({ changeSet, executed: false, next: 'Describe the change set and verify no unexpected removal or replacement before execution. Restore through CloudFormation to keep SAM and the deployed stack aligned.' }))
} else throw Error('Use --plan, --capture or --prepare <private snapshot directory>')
