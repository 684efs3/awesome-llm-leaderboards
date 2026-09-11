import { readFile, writeFile } from 'node:fs/promises'

const begin = '<!-- BEGIN LIST -->'
const end = '<!-- END LIST -->'
const [items, readme] = await Promise.all([
  readFile('collection.json', 'utf8').then(JSON.parse),
  readFile('README.md', 'utf8'),
])
const start = readme.indexOf(begin)
const stop = readme.indexOf(end)
if (start < 0 || stop < 0) throw new Error('README markers missing')

const domain = url => new URL(url).hostname.replace(/^www\./, '')
const lines = [...items]
  .sort((a, b) => domain(a.url).localeCompare(domain(b.url)))
  .map(({ name, url, description }) => `- [${name}](${url}) - ${description}`)
const block = `${begin}\n\n## Sources\n\n${lines.join('\n')}\n\n${end}`
const next = `${readme.slice(0, start)}${block}${readme.slice(stop + end.length)}`

await writeFile('README.md', next)
console.log(`Wrote ${lines.length} sources to README`)
