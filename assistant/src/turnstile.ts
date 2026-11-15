type Verification = { success?: boolean; hostname?: string; action?: string; 'error-codes'?: unknown }
const providerCodes = new Set(['missing-input-secret', 'invalid-input-secret', 'missing-input-response', 'invalid-input-response', 'bad-request', 'timeout-or-duplicate', 'internal-error'])

export function captchaStatus(code: string) {
  return code === 'captcha_required' ? 400 : code === 'captcha_failed' ? 403 : 503
}

export async function verifyTurnstile({ token, secret, origin, ip }: { token: unknown; secret: string; origin: string; ip: string }, dependencies = { fetch, report: (diagnostic: Record<string, unknown>) => console.warn(JSON.stringify(diagnostic)) }) {
  if (typeof token !== 'string' || !token.trim() || token.length > 2048) throw Error('captcha_required')
  let response: Response, result: Verification
  try {
    response = await dependencies.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(10000),
    })
    result = await response.json() as Verification
    if (!result || typeof result !== 'object') throw Error('invalid_response')
  } catch {
    dependencies.report({ event: 'turnstile_verification_failed', reason: 'provider_unavailable' })
    throw Error('captcha_unavailable')
  }
  const codes = Array.isArray(result['error-codes']) ? result['error-codes'].filter((code): code is string => typeof code === 'string' && providerCodes.has(code)) : []
  const reason = !response.ok ? 'provider_http_error' : !result.success ? 'provider_rejected' : result.hostname !== new URL(origin).hostname ? 'hostname_mismatch' : result.action !== 'lead-chat' ? 'action_mismatch' : ''
  if (!reason) return
  // Only fixed reasons and documented codes; never log the response, token, IP or secret.
  dependencies.report({ event: 'turnstile_verification_failed', reason, codes, status: response.status })
  throw Error(!response.ok || codes.some(code => ['internal-error', 'missing-input-secret', 'invalid-input-secret'].includes(code)) ? 'captcha_unavailable' : 'captcha_failed')
}
