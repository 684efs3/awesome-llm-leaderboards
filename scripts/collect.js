import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const force = Boolean(process.env.CI || process.env.COLLECT_FORCE)
const items = JSON.parse(await readFile('collection.json', 'utf8'))
const limit = Number(process.env.COLLECT_LIMIT || items.length)
const previous = await readFile('public/data/sources.json', 'utf8').then(JSON.parse).catch(() => [])
const cached = Object.fromEntries(previous.map(item => [item.id, item]))
const hasShot = id => access(`public/shots/${id}.jpg`).then(() => true).catch(() => false)
const host = url => new URL(url).hostname.replace(/^www\./, '')
const pick = (...values) => values
  .map(value => value?.trim().replaceAll('\u2014', '-').replaceAll('\u2013', '-'))
  .find(Boolean) || ''

const resolve = (item, scraped = {}) => {
  const { wait, name, description, icon, ...rest } = item
  const resolved = {
    ...rest,
    name: pick(name, scraped.name, host(item.url)),
    description: pick(description, scraped.description),
    icon: pick(icon, scraped.icon) || undefined,
  }
  return Object.fromEntries(Object.entries(resolved).filter(([, value]) => value !== undefined))
}

await mkdir('public/shots', { recursive: true })

const fromCache = item => {
  const hit = cached[item.id] || {}
  console.log(`Cached ${item.id}`)
  return {
    ...resolve(item, hit),
    screenshot: `/shots/${item.id}.jpg`,
    enable: true,
  }
}

const scrape = async (context, item) => {
  const page = await context.newPage()
  const hit = cached[item.id] || {}
  const fallback = hit.screenshot
    ? { ...resolve(item, hit), screenshot: hit.screenshot, enable: true }
    : { ...resolve(item), enable: false }
  const { result, fresh } = await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    .then(async () => {
      if (item.wait) await new Promise(r => setTimeout(r, item.wait))
      const scraped = await page.evaluate(() => {
        const meta = (attr, key) => document.querySelector(`meta[${attr}="${key}"]`)?.content
        const link = sel => document.querySelector(sel)?.href
        const trim = value => value?.trim() || ''
        const brand = title => {
          const text = trim(title)
          if (!text) return ''
          if (text.length <= 40) return text
          const tail = text.split(/\s*\|\s*/).at(-1)?.trim()
          return tail && tail.length <= 40 ? tail : ''
        }
        const icon = [link('link[rel~="icon"]'), link('link[rel="apple-touch-icon"]')]
          .map(trim).find(href => href && !href.startsWith('data:')) || ''
        return {
          name: [
            meta('name', 'application-name'),
            meta('name', 'apple-mobile-web-app-title'),
            meta('property', 'og:site_name'),
            brand(meta('property', 'og:title')),
            brand(meta('name', 'twitter:title')),
            brand(document.title),
          ].map(trim).find(Boolean) || '',
          description: [meta('name', 'description'), meta('property', 'og:description'), meta('name', 'twitter:description')]
            .map(trim).find(Boolean) || '',
          icon,
        }
      })
      const screenshot = `/shots/${item.id}.jpg`
      await page.screenshot({ path: `public${screenshot}`, type: 'jpeg', quality: 75 })
      return { result: { ...resolve(item, scraped), screenshot, enable: true }, fresh: true }
    })
    .catch(error => (console.log(`Skipped ${item.id}: ${error.message}`), { result: fallback, fresh: false }))
  await page.close()
  if (fresh) console.log(`Collected ${item.id}`)
  return result
}

const stale = item => {
  const hit = cached[item.id]
  return !hit?.name || hit.url !== item.url
}

const plan = []
for (const item of items.slice(0, limit)) {
  plan.push({ item, skip: !force && await hasShot(item.id) && !stale(item) })
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
