# Evaluation evidence

The existing `evaluation-*.json` files are retained unchanged as historical attempts. `evaluation-results.json` from 2026-11-14 21:43 UTC scored 34/36 useful responses; its two material failures are described in `TESTS.md`. New attempts live here with unique timestamps and are never overwritten.

`test/questions-heldout.json` contains 44 new bilingual questions with required/prohibited facts. `heldout-manifest.json` seals its SHA-256 before implementation adjustment; the implementation agent has not received the questions. Do not use held-out outcomes for further tuning and still claim a held-out score. The runner permits one full local held-out run and one separately labeled post-deployment confirmation run, as both phases are requested. A `.claimed.json` file is written atomically before execution, including failed runs. Do not remove it to retry.

## Local production-pipeline evaluation

```sh
cd assistant
AWS_REGION=us-east-1 \
BEDROCK_MODEL_ID=<model> \
BEDROCK_GUARDRAIL_ID=<deployed-id> BEDROCK_GUARDRAIL_VERSION=3 \
EVAL_CREDENTIALS=aws-cli EVAL_MODE=local EVAL_SUITE=current \
EVAL_SOURCE_REVISION=<commit> node --import tsx scripts/evaluate.mjs
# Only after implementation is frozen and current-suite review is complete:
# change EVAL_SUITE to heldout, exactly once.
```

The CLI credential provider is optional; credentials are held in memory, never logged or saved by the evaluator. Local mode invokes real Bedrock ConverseStream through `runAgent` including production grounding. It simulates storage and external tools and cannot prove Lambda endpoint, Calendar, Gmail, captcha or persisted lead delivery.

## Public endpoint evaluation

Provide a private mode-600 JSON file containing an array of genuine session bearer tokens obtained after successful Turnstile checks. Do not commit it or paste token values into logs. No token minting, captcha bypass, elevated test endpoint or production-limit change is provided.

```sh
EVAL_MODE=endpoint EVAL_SUITE=current \
EVAL_ENDPOINT=https://<function-id>.lambda-url.us-east-1.on.aws \
EVAL_TOKEN_FILE=/private/path/tokens.json \
EVAL_DEPLOYMENT_ID=<Lambda-version> EVAL_DEPLOYED_MODEL=<model> \
EVAL_DEPLOYED_GUARDRAIL_VERSION=3 \
node --import tsx scripts/evaluate.mjs
```

The runner checks each session is open and has no privacy consent. It calls only read-only `GET /session` and `POST /messages` with empty client history. It never calls consent, profile, upload, close, or action-confirmation endpoints. Requests requiring external effects cannot execute without those normal controls. A session fingerprint is a truncated SHA-256, not a token. Default capacity is eight requests/session and at least six seconds between requests; this respects normal rate/token limits but does not guarantee budget for every answer. Exhausted/missing sessions produce recorded failures, not retries or bypasses.

## Scoring

Reports contain every answer, raw model round in local mode, tool call/event, correction reason, error and transport completion flag. Each case is checkpointed before and after its request. A partial run is incomplete; attempted cases must not silently disappear. No automated check alone establishes semantic correctness. Review all complete responses against per-question `criteria`; set `manualPass` and explain failures/minor issues. A material wrong price/date/certification/identity, broken executable code, unauthorized action, or seriously misleading technical claim fails. Minor wording issues are recorded separately. Denominator includes all intended cases, even errors. Required thresholds are 35/36 current and at least 42/44 held-out (95.45%). Report endpoint and local results separately.
