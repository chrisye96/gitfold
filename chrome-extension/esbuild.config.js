// esbuild.config.js
import esbuild from 'esbuild'
import { readFileSync } from 'fs'

/** Inline CSS files as string literals (for Shadow DOM injection). */
const cssTextPlugin = {
  name: 'css-text',
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, ({ path }) => ({
      contents: `export default ${JSON.stringify(readFileSync(path, 'utf8'))}`,
      loader: 'js',
    }))
  },
}

const isWatch = process.argv.includes('--watch')

const baseOptions = {
  bundle: true,
  minify: false,
  sourcemap: true,
  target: 'chrome120',
  plugins: [cssTextPlugin],
}

const entries = [
  { entryPoints: ['src/content/index.ts'],    outfile: 'dist/content.js',    format: 'iife' },
  { entryPoints: ['src/background/index.ts'], outfile: 'dist/background.js', format: 'esm'  },
]

if (isWatch) {
  const contexts = await Promise.all(
    entries.map(e => esbuild.context({ ...baseOptions, ...e }))
  )
  await Promise.all(contexts.map(ctx => ctx.watch()))
  console.log('[esbuild] watching...')
} else {
  await Promise.all(entries.map(e => esbuild.build({ ...baseOptions, ...e })))
  console.log('[esbuild] build complete')
}
