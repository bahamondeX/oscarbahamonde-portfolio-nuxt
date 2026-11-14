import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import { cfg } from './config.js'
const secrets = new SecretsManagerClient({})
const cache = new Map<string, { value: any; until: number }>()
export async function secret(arn: string) {
  const hit = cache.get(arn)
  if (hit && hit.until > Date.now()) return hit.value
  const r = await secrets.send(new GetSecretValueCommand({ SecretId: arn }))
  const value = JSON.parse(r.SecretString || '{}')
  cache.set(arn, { value, until: Date.now() + 300000 })
  return value
}
export async function google(path: string, options: RequestInit = {}) {
  const c = await secret(cfg.googleSecret)
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: c.client_id,
      client_secret: c.client_secret,
      refresh_token: c.refresh_token,
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(10000),
  })
  if (!tokenResponse.ok) throw Error('google_auth_failed')
  const { access_token } = (await tokenResponse.json()) as any
  const r = await fetch('https://www.googleapis.com/' + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      Authorization: `Bearer ${access_token}`,
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!r.ok) throw Object.assign(Error('google_request_failed'), { status: r.status })
  return r.json() as Promise<any>
}
export async function sendRaw(raw: Buffer) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await google('gmail/v1/users/me/messages/send', {
        method: 'POST',
        body: JSON.stringify({ raw: raw.toString('base64url') }),
      })
    } catch (e: any) {
      if (![429, 500, 502, 503, 504].includes(e.status) || attempt >= 3) throw e
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt + Math.random() * 200))
    }
  }
}
