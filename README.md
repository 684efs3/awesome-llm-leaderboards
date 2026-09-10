<div align="center">
  <h1>Awesome LLM Leaderboards</h1>
  <p><b>Find where to compare LLMs, not which model to pick.</b></p>
  <p>A directory of LLM leaderboards, pricing tables, and comparison tools.</p>
  <p><a href="https://metaory.github.io/awesome-llm-leaderboards/">metaory.github.io/awesome-llm-leaderboards</a></p>
</div>

## Why

Model rankings and price sheets live on dozens of sites. Searching for "best coding model" or "Claude vs GPT price" scatters you across bookmarks and tabs. This project indexes those sources in one place so you can find where to compare, not which model to pick.

## How it works

[`collection.json`](collection.json) in git is the source of truth. CI runs on a schedule (and on push): it refreshes metadata and screenshots from each listed site, then builds and publishes the static directory to GitHub Pages.

## Contribute a source

Add one entry to [`collection.json`](collection.json):

```json
{
  "id": "short-slug",
  "name": "Display Name",
  "url": "https://example.com/",
  "description": "One short sentence.",
  "tags": ["leaderboard"],
  "icon": "https://example.com/favicon.ico"
}
```

One site, one entry. Tags must be from: `benchmarks`, `calculator`, `catalog`, `coding`, `comparison`, `leaderboard`, `pricing`. `id` and `url` must be unique.

Open a PR. CI picks up new sources on the next run.

## License

[MIT](LICENSE)
