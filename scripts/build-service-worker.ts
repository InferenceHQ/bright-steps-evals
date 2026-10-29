import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const output = resolve(import.meta.dirname, '../dist')
const assetDirectory = resolve(output, 'assets')
const assets = (await readdir(assetDirectory)).map((name) => `/assets/${name}`)
const source = await readFile(resolve(import.meta.dirname, '../public/service-worker.js'), 'utf8')
const rendered = source.replace("const CORE = ['/', '/index.html', '/manifest.webmanifest']", `const CORE = ${JSON.stringify(['/', '/index.html', '/manifest.webmanifest', ...assets])}`)
await writeFile(resolve(output, 'service-worker.js'), rendered)
