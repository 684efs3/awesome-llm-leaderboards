import { readFile } from 'node:fs/promises'

const tags = new Set(['benchmarks', 'calculator', 'catalog', 'coding', 'comparison', 'leaderboard', 'pricing'])
const items = JSON.parse(await readFile('collection.json', 'utf8'))
const required = ['id', 'url', 'tags']
const duplicate = key => items.find((item, index) => items.findIndex(other => other[key] === item[key]) !== index)?.[key]
const invalid = items.find(item => required.some(key => !item[key]) || !/^https:\/\//.test(item.url) || item.tags.some(tag => !tags.has(tag)))
const dupId = duplicate('id')
const dupUrl = duplicate('url')
const error = invalid && `Invalid record: ${invalid.id}` || dupId && `Duplicate ID: ${dupId}` || dupUrl && `Duplicate URL: ${dupUrl}`

if (error) throw new Error(error)
console.log(`Validated ${items.length} sources`)
