import { readFile, writeFile } from 'node:fs/promises'

const begin = '<!-- BEGIN LIST -->'
const end = '<!-- END LIST -->'
const [items, sources, readme] = await Promise.all([
  readFile('collection.json', 'utf8').then(JSON.parse),
  readFile('public/data/sources.json', 'utf8').then(JSON.parse).catch(() => []),
  readFile('README.md', 'utf8'),
])
const start = readme.indexOf(begin)
const stop = readme.indexOf(end)
if (start < 0 || stop < 0) throw new Error('README markers missing')

const host = url => new URL(url).hostname.replace(/^www\./, '')
const byId = Object.fromEntries(sources.map(item => [item.id, item]))
const lines = [...items]
  .sort((a, b) => host(a.url).localeCompare(host(b.url)))
  .map(item => {
    const hit = byId[item.id] || {}
    const name = item.name || hit.name || host(item.url)
    const description = item.description || hit.description || ''
    return `- [${name}](${item.url})${description ? ` - ${description}` : ''}`
  })
const block = `${begin}\n\n## Sources\n\n${lines.join('\n')}\n\n${end}`
const next = `${readme.slice(0, start)}${block}${readme.slice(stop + end.length)}`

await writeFile('README.md', next)
console.log(`Wrote ${lines.length} sources to README`)
