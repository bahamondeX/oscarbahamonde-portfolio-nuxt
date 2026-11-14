# Independent validator review

These are direct unit probes of `groundAnswer` and lexical retrieval, **not** Bedrock responses, production results, or the held-out evaluation. The supplied drafts intentionally exercise false claims and benign technical language. Historical attempts remain available even after a fix.

`attempt-02.json` records eight probes against the source hashes embedded in that artifact. It exposed technical prose being replaced by career records, an unsupported delivery promise surviving price correction, and model claims of a sent email/reserved slot without tool authority. The retrieval probe also ranked an ITIL credential above the service catalog for a broad price query. These observations were reported to the grounding author before further changes.

`attempt-03.json` preserves the first correction pass: seven of eight probes satisfied their expected behavior; the reserved-slot sentence still passed through. `attempt-04.json` and `review-result.json` record the final independent check: all eight direct probes satisfied their criteria, with service records ranked above ITIL for the broad commercial query. This is not a model-accuracy score and does not establish the requested deployed 36-question/held-out acceptance result.

To repeat the same probes after a change, from `assistant/` run the following. Change the output name for every attempt; the command refuses to overwrite prior evidence.

```sh
node --import tsx --input-type=module <<'NODE'
import { groundAnswer } from './src/grounding.ts'
import { retrieveFacts } from './src/retrieval.ts'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const dir = '../docs/audit/after/grounding-review/'
const prior = JSON.parse(readFileSync(dir + 'attempt-02.json', 'utf8'))
const sourceHashes = Object.fromEntries(Object.keys(prior.sourceHashes).map(path => [path,
  createHash('sha256').update(readFileSync(path)).digest('hex')]))
const result = {
  recordedAt: new Date().toISOString(), scope: prior.scope, sourceHashes,
  cases: prior.cases.map(({ answer, corrections, ...input }) => ({ ...input,
    ...groundAnswer(input.raw, input.locale, input.question) })),
  retrieval: prior.retrieval.map(({ query, locale }) => ({ query, locale,
    ids: retrieveFacts(query, locale, 8).map(record => record.id) }))
}
writeFileSync(dir + 'attempt-05.json', JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
NODE
```

Review the complete resulting strings against each `expected` field; a changed output or a correction counter alone is not a pass. Tool authorization is a separate server-side control: a false model sentence does not itself create an event or send an email.
