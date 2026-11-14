import { spawnSync } from 'node:child_process'
const required = [
  'BEDROCK_MODEL_ID',
  'BEDROCK_MODEL_ARN',
  'GOOGLE_SECRET_ARN',
  'TURNSTILE_SECRET_ARN',
  'OWNER_EMAIL',
  'TURNSTILE_SITE_KEY',
]
for (const name of required) if (!process.env[name]) throw Error(`Missing ${name}; see README.md`)
const run = (args, capture = false) => {
  const r = spawnSync('aws', args, {
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  })
  if (r.status !== 0) throw Error(`AWS command failed: ${args.slice(0, 2).join(' ')}`)
  return r.stdout?.trim()
}
const region = process.env.AWS_REGION || 'us-east-1',
  stack = process.env.ASSISTANT_STACK || 'oscar-assistant'
if (!/^[a-z][a-z0-9-]{2,40}$/.test(stack)) throw Error('Invalid stack name')
const account = run(['sts', 'get-caller-identity', '--query', 'Account', '--output', 'text'], true)
const bucket = `${stack}-artifacts-${account}-${region}`
const head = spawnSync('aws', ['s3api', 'head-bucket', '--bucket', bucket], { stdio: 'ignore' })
if (head.status !== 0)
  run([
    's3api',
    'create-bucket',
    '--bucket',
    bucket,
    '--region',
    region,
    ...(region === 'us-east-1'
      ? []
      : ['--create-bucket-configuration', `LocationConstraint=${region}`]),
  ])
run([
  's3api',
  'put-public-access-block',
  '--bucket',
  bucket,
  '--public-access-block-configuration',
  'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true',
])
run([
  's3api',
  'put-bucket-encryption',
  '--bucket',
  bucket,
  '--server-side-encryption-configuration',
  JSON.stringify({ Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }] }),
])
run([
  'cloudformation',
  'package',
  '--template-file',
  'template.yaml',
  '--s3-bucket',
  bucket,
  '--output-template-file',
  'packaged.yaml',
  '--region',
  region,
])
const params = {
  SiteOrigin: 'https://oscarbahamonde.com',
  OwnerEmail: process.env.OWNER_EMAIL,
  ModelId: process.env.BEDROCK_MODEL_ID,
  ModelArn: process.env.BEDROCK_MODEL_ARN,
  GoogleSecretArn: process.env.GOOGLE_SECRET_ARN,
  TurnstileSecretArn: process.env.TURNSTILE_SECRET_ARN,
  TurnstileSiteKey: process.env.TURNSTILE_SITE_KEY,
  RetentionDays: process.env.RETENTION_DAYS || '90',
  MonthlyBudgetUsd: process.env.MONTHLY_BUDGET_USD || '10',
}
run([
  'cloudformation',
  'deploy',
  '--template-file',
  'packaged.yaml',
  '--stack-name',
  stack,
  '--s3-bucket',
  bucket,
  '--region',
  region,
  '--capabilities',
  'CAPABILITY_IAM',
  'CAPABILITY_AUTO_EXPAND',
  '--no-fail-on-empty-changeset',
  '--parameter-overrides',
  ...Object.entries(params).map(([k, v]) => `${k}=${v}`),
])
run([
  'cloudformation',
  'describe-stacks',
  '--stack-name',
  stack,
  '--region',
  region,
  '--query',
  'Stacks[0].Outputs',
  '--output',
  'table',
])
