// Leave time for the request to reach Siteverify before its five-minute expiry.
export function captchaFresh(token, issuedAt, now = Date.now()) {
  return !!token && issuedAt > 0 && now - issuedAt < 270000 && now >= issuedAt
}

export async function createVerifiedSession({ token, locale, request, consume, recover }) {
  // A request may consume the token even if its response never reaches the browser.
  consume()
  try {
    return await request('/session', { token, locale })
  } catch (error) {
    recover(error)
    return null
  }
}
