import postgres from 'postgres'
let client: ReturnType<typeof postgres> | undefined
export function db() {
  const c = useRuntimeConfig()
  if (!c.databaseUrl) throw createError({ statusCode: 503, message: 'Chat unavailable' })
  return client ??= postgres(c.databaseUrl, { max: 2, prepare: false, idle_timeout: 20, connect_timeout: 8, ssl: c.databaseSsl === 'disable' ? false : 'require' })
}
