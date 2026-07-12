import { cp, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const distRoot = resolve(projectRoot, 'dist')

await mkdir(resolve(distRoot, 'server'), { recursive: true })
await mkdir(resolve(distRoot, '.openai'), { recursive: true })

await cp(resolve(projectRoot, 'server', 'index.mjs'), resolve(distRoot, 'server', 'index.js'))
await cp(resolve(projectRoot, '.openai', 'hosting.json'), resolve(distRoot, '.openai', 'hosting.json'))
