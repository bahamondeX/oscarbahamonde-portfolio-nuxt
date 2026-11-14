export const cfg = {
  origin: process.env.SITE_ORIGIN || 'https://oscarbahamonde.com',
  table: process.env.SESSIONS_TABLE!,
  messages: process.env.MESSAGES_TABLE!,
  leads: process.env.LEADS_TABLE!,
  bucket: process.env.UPLOAD_BUCKET!,
  key: process.env.KMS_KEY_ARN!,
  owner: process.env.OWNER_EMAIL!,
  model: process.env.BEDROCK_MODEL_ID!,
  guardrail: process.env.BEDROCK_GUARDRAIL_ID!,
  guardrailVersion: process.env.BEDROCK_GUARDRAIL_VERSION || '1',
  googleSecret: process.env.GOOGLE_SECRET_ARN!,
  captchaSecret: process.env.TURNSTILE_SECRET_ARN!,
  days: Number(process.env.RETENTION_DAYS || 90),
  maxBytes: Number(process.env.MAX_FILE_BYTES || 5000000),
  maxFiles: Number(process.env.MAX_FILES || 5),
  maxTurns: Number(process.env.MAX_TURNS || 30),
  maxTokens: Number(process.env.MAX_TOKENS || 800),
  maxSessionTokens: Number(process.env.MAX_SESSION_TOKENS || 60000),
  buffer: Number(process.env.CALENDAR_BUFFER_MINUTES || 15),
  freeIntro: process.env.FREE_INTRO_CALL_ENABLED === 'true',
}
export const expires = () => Math.floor(Date.now() / 1000) + cfg.days * 86400
export const ttlActive = (row: any) => row && row.ttl > Date.now() / 1000 && !row.deleted
export function metric(name: string, value = 1) {
  process.stdout.write(
    JSON.stringify({
      _aws: {
        Timestamp: Date.now(),
        CloudWatchMetrics: [
          {
            Namespace: 'OscarAssistant',
            Dimensions: [[]],
            Metrics: [{ Name: name, Unit: 'Count' }],
          },
        ],
      },
      [name]: value,
    }) + '\n',
  )
}
