import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { runScorecard } from './evaluator'

const scorecard = await runScorecard()
const output = JSON.stringify(scorecard, null, 2)

if (process.argv.includes('--write')) {
  const results = resolve(import.meta.dirname, 'results')
  await mkdir(results, { recursive: true })
  await writeFile(resolve(results, 'latest.json'), `${output}\n`)
}

console.log(output)
