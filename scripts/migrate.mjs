import postgres from 'postgres'
import { readdir, readFile } from 'node:fs/promises'
if (!process.env.NUXT_DATABASE_URL) throw new Error('NUXT_DATABASE_URL is required')
const sql = postgres(process.env.NUXT_DATABASE_URL, { max: 1, prepare: false, ssl: process.env.NUXT_DATABASE_SSL === 'disable' ? false : 'require' })
try {
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`
  for (const name of (await readdir(new URL('../migrations/',import.meta.url))).filter(n=>n.endsWith('.sql')).sort()) {
    await sql.begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(940120)`
      if ((await tx`SELECT name FROM schema_migrations WHERE name=${name}`).length) return
      await tx.unsafe(await readFile(new URL('../migrations/'+name,import.meta.url),'utf8'))
      await tx`INSERT INTO schema_migrations(name) VALUES (${name})`
      console.log('Applied',name)
    })
  }
} finally { await sql.end() }
