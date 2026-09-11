import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const force = Boolean(process.env.CI || process.env.COLLECT_FORCE)
const items = JSON.parse(await readFile('collection.json', 'utf8'))
const limit = Number(process.env.COLLECT_LIMIT || items.length)
const previous = await readFile('public/data/sources.json', 'utf8').then(JSON.parse).catch(() => [])
const cached = Object.fromEntries(previous.map(item => [item.id, item]))
const hasShot = id => access(`public/shots/${id}.jpg`).then(() => true).catch(() => false)

await mkdir('public/shots', { recursive: true })

const fromCache = item => {
  const { wait, ...rest } = item
  const hit = cached[item.id] || {}
  console.log(`Cached ${item.id}`)
  return {
    ...rest,
    description: hit.description || item.description,
    icon: hit.icon || item.icon,
    screenshot: `/shots/${item.id}.jpg`,
    enable: true,
  }
}

const scrape = async (context, item) => {
  const { wait, ...rest } = item
  const page = await context.newPage()
  const fallback = { ...rest, enable: false }
  const output = await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    .then(async () => {
      if (wait) await new Promise(r => setTimeout(r, wait))
      const meta = await page.evaluate(() => ({
        description: document.querySelector('meta[name="description"]')?.content,
        icon: document.querySelector('link[rel~="icon"]')?.href,
      }))
      const screenshot = `/shots/${item.id}.jpg`
      await page.screenshot({ path: `public${screenshot}`, type: 'jpeg', quality: 75 })
      return { ...fallback, ...Object.fromEntries(Object.entries(meta).filter(([, value]) => value)), screenshot, enable: true }
    })
    .catch(error => (console.log(`Skipped ${item.id}: ${error.message}`), fallback))
  await page.close()
  if (output.screenshot) console.log(`Collected ${item.id}`)
  return output
}

const plan = []
for (const item of items.slice(0, limit)) {
  plan.push({ item, skip: !force && await hasShot(item.id) })
}

const bin = process.env.CHROMIUM_PATH
const useBin = bin && await access(bin).then(() => true).catch(() => false)
const browser = plan.some(({ skip }) => !skip)
  ? await chromium.launch({ headless: true, ...(useBin && { executablePath: bin }) })
  : null
const context = browser
  ? await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
  : null

const sources = []
for (const { item, skip } of plan) {
  sources.push(skip ? fromCache(item) : await scrape(context, item))
}

if (browser) await browser.close()
await writeFile('public/data/sources.json', `${JSON.stringify(sources, null, 2)}\n`)
