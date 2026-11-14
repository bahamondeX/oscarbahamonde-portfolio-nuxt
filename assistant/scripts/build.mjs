import { build } from 'esbuild'
await build({
  entryPoints: ['src/http.ts', 'src/tool.ts', 'src/notify-lead.ts', 'src/media.ts', 'src/sweep.ts'],
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  sourcemap: false,
  external: [],
})

await import('node:fs/promises').then((fs) =>
  fs.writeFile('dist/package.json', JSON.stringify({ type: 'commonjs' })),
)
