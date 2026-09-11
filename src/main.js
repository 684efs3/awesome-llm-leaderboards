import './style.css'

const base = import.meta.env.BASE_URL
const asset = path => `${base}${String(path).replace(/^\//, '')}`
const app = document.querySelector('#app')
const catalog = (await fetch(asset('data/sources.json')).then(r => r.ok && r.json()) || [])
  .filter(item => item.enable !== false)
const tags = [...new Set(catalog.flatMap(({ tags }) => tags))].sort()
const byName = (a, b) => a.name.localeCompare(b.name)
const saved = JSON.parse(localStorage.favorites || '[]')
const state = new Proxy({ query: '', tag: '', theme: localStorage.theme || '', favorites: saved }, {
  set: (target, key, value) => (target[key] = value, update(), true),
})
const host = url => new URL(url).hostname.replace(/^www\./, '')
const matchQuery = (item, query) => `${item.name} ${item.description} ${item.tags.join(' ')}`.toLowerCase().includes(query)
const prefersDark = () => matchMedia('(prefers-color-scheme: dark)').matches
const resolvedTheme = () => state.theme || (prefersDark() ? 'dark' : 'light')
const svg = (viewBox, d, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${extra} aria-hidden="true"><path fill="currentColor" d="${d}"/></svg>`
const icons = {
  star: svg('0 0 36 36', 'M34 16.78a2.22 2.22 0 0 0-1.29-4l-9-.34a.23.23 0 0 1-.2-.15l-3.11-8.4a2.22 2.22 0 0 0-4.17 0l-3.1 8.43a.23.23 0 0 1-.2.15l-9 .34a2.22 2.22 0 0 0-1.29 4l7.06 5.55a.23.23 0 0 1 .08.24l-2.43 8.61a2.22 2.22 0 0 0 3.38 2.45l7.46-5a.22.22 0 0 1 .25 0l7.46 5a2.2 2.2 0 0 0 2.55 0a2.2 2.2 0 0 0 .83-2.4l-2.45-8.64a.22.22 0 0 1 .08-.24Z', ' width="1em" height="1em"'),
  sun: svg('0 0 24 24', 'M12 18a6 6 0 1 1 0-12a6 6 0 0 1 0 12m0-16a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1m0 18a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1M4.22 4.22a1 1 0 0 1 1.42 0l.7.7a1 1 0 1 1-1.41 1.42l-.71-.71a1 1 0 0 1 0-1.41m14.14 14.14a1 1 0 0 1 1.42 0l.7.7a1 1 0 0 1-1.41 1.42l-.71-.71a1 1 0 0 1 0-1.41M1 12a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2H2a1 1 0 0 1-1-1m18 0a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2h-1a1 1 0 0 1-1-1M4.22 19.78a1 1 0 0 1 0-1.42l.7-.7a1 1 0 1 1 1.42 1.41l-.71.71a1 1 0 0 1-1.41 0m14.14-14.14a1 1 0 0 1 0-1.42l.7-.7a1 1 0 0 1 1.42 1.41l-.71.71a1 1 0 0 1-1.41 0'),
  moon: svg('0 0 24 24', 'M12.1 22a9.9 9.9 0 0 1-9.9-9.9A9.9 9.9 0 0 1 12.5 2a.75.75 0 0 1 .66 1.1A8.1 8.1 0 0 0 20.9 14.7a.75.75 0 0 1-.05.88A9.86 9.86 0 0 1 12.1 22'),
  github: svg('0 0 16 16', 'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8'),
  mark: svg('0 0 64 64', 'M4 52c0 2 2 4 4 4h12c2 0 4-2 4-4V40h12c2 0 4-2 4-4V28h12c2 0 4-2 4-4V12c0-2-2-4-4-4H44c-2 0-4 2-4 4v8H28c-2 0-4 2-4 4v8H12c-2 0-4 2-4 4z'),
}

const card = ({ id, name, url, description, tags: itemTags, icon, screenshot }) => {
  const on = state.favorites.includes(id)
  return `
  <article class="card${on ? ' favorited' : ''}" data-url="${url}" data-id="${id}">
    <button type="button" class="fav" data-fav="${id}" aria-pressed="${on}" aria-label="${on ? 'Remove from favorites' : 'Add to favorites'}">${icons.star}</button>
    <a class="preview" href="${url}" target="_blank" rel="noreferrer" aria-label="${name}">
      ${screenshot ? `<img src="${asset(screenshot)}" alt="" loading="lazy">` : '<span>Open site</span>'}
      <span class="host" aria-hidden="true">${host(url)}</span>
    </a>
    <section>
      <header><img src="${icon}" alt="" onerror="this.remove()"><h2>${name}</h2></header>
      <p>${description}</p>
      <footer>${itemTags.map(tag => `<button data-tag="${tag}">${tag}</button>`).join('')}</footer>
    </section>
  </article>`
}

app.innerHTML = `
  <div class="toolbar">
    <a class="github" href="https://github.com/metaory/awesome-llm-leaderboards" target="_blank" rel="noreferrer" aria-label="GitHub repository">${icons.github}</a>
    <button class="theme" type="button" aria-label="Switch to dark mode"></button>
  </div>
  <header class="masthead">
    <a class="brand" href="${base}">
      <span class="mark">${icons.mark}</span>
      Awesome LLM Leaderboards
    </a>
    <p>Browse leaderboards, model collections, and comparison tools in one place.</p>
    <label><span class="sr-only">Search sources</span><input type="search" placeholder="Search leaderboards and collections"></label>
  </header>
  <div class="favs" hidden></div>
  <nav aria-label="Filter sources"></nav>
  <div class="results"></div>
  <p class="site-foot">Want to contribute? <a href="https://github.com/metaory/awesome-llm-leaderboards#contribute-a-source" target="_blank" rel="noreferrer">Add a source</a></p>`

const input = app.querySelector('input')
const favsEl = app.querySelector('.favs')
const nav = app.querySelector('nav')
const results = app.querySelector('.results')
const themeBtn = app.querySelector('.theme')
const drag = { x: 0, left: 0, moved: false }

const syncMask = () => {
  const max = nav.scrollWidth - nav.clientWidth
  nav.dataset.edge = [
    nav.scrollLeft > 4 ? 'start' : '',
    nav.scrollLeft < max - 4 ? 'end' : '',
  ].filter(Boolean).join(' ') || 'none'
}

const update = () => {
  const query = state.query.toLowerCase()
  const scroll = nav.scrollLeft
  const [favs, rest] = catalog.reduce((acc, item) => {
    if (!matchQuery(item, query)) return acc
    const fav = state.favorites.includes(item.id)
    if (!fav && state.tag && !item.tags.includes(state.tag)) return acc
    acc[fav ? 0 : 1].push(item)
    return acc
  }, [[], []])
  favs.sort(byName)
  rest.sort(byName)
  nav.innerHTML = `<button class="${state.tag ? '' : 'active'}" data-tag="">all</button>${tags.map(tag => `<button class="${state.tag === tag ? 'active' : ''}" data-tag="${tag}">${tag}</button>`).join('')}`
  nav.scrollLeft = scroll
  syncMask()
  favsEl.hidden = !favs.length
  favsEl.innerHTML = favs.length ? `<h2>${icons.star} Favorites</h2><div class="grid">${favs.map(card).join('')}</div>` : ''
  results.innerHTML = `<section class="grid">${rest.map(card).join('') || (favs.length ? '' : '<p class="empty">No matches. Clear search or pick another category.</p>')}</section>`
  const dark = resolvedTheme() === 'dark'
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  themeBtn.innerHTML = dark ? icons.sun : icons.moon
  themeBtn.ariaLabel = dark ? 'Switch to light mode' : 'Switch to dark mode'
}

nav.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch') return
  drag.x = e.clientX
  drag.left = nav.scrollLeft
  drag.moved = false
})
nav.addEventListener('pointermove', e => {
  if (e.pointerType === 'touch' || !e.buttons) return
  const delta = e.clientX - drag.x
  if (Math.abs(delta) <= 8) return
  if (!drag.moved) {
    drag.moved = true
    nav.setPointerCapture(e.pointerId)
  }
  nav.scrollLeft = drag.left - delta
})
nav.addEventListener('pointerup', e => {
  if (e.pointerType === 'touch') return
  if (nav.hasPointerCapture(e.pointerId)) nav.releasePointerCapture(e.pointerId)
})
nav.addEventListener('click', e => {
  if (drag.moved) {
    drag.moved = false
    return e.preventDefault(), e.stopPropagation()
  }
  const button = e.target.closest('[data-tag]')
  if (button) state.tag = button.dataset.tag
}, true)
nav.addEventListener('scroll', syncMask, { passive: true })

results.onclick = favsEl.onclick = ({ target }) => {
  const fav = target.closest('[data-fav]')
  if (fav) {
    const id = fav.dataset.fav
    const next = state.favorites.includes(id) ? state.favorites.filter(x => x !== id) : [...state.favorites, id]
    localStorage.favorites = JSON.stringify(next)
    return state.favorites = next
  }
  const tag = target.closest('[data-tag]')
  if (tag) {
    state.tag = tag.dataset.tag
    return scrollTo({ top: results.offsetTop - 80, behavior: 'smooth' })
  }
  if (target.closest('a')) return
  const url = target.closest('.card')?.dataset.url
  if (url) open(url, '_blank')
}
results.ondragstart = favsEl.ondragstart = e => e.preventDefault()

input.addEventListener('input', ({ target }) => state.query = target.value)
themeBtn.addEventListener('click', () => {
  localStorage.theme = state.theme = resolvedTheme() === 'dark' ? 'light' : 'dark'
})
update()
