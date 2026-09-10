import { spawn } from 'node:child_process'
import { watch } from 'node:fs'

let running = false
let queued = false
let timer

const collect = () => new Promise(resolve => {
  spawn('npm', ['run', 'collect'], { stdio: 'inherit' }).on('exit', resolve)
})

const run = async () => {
  if (running) return queued = true
  running = true
  await collect()
  running = false
  if (!queued) return
  queued = false
  return run()
}

const schedule = () => {
  clearTimeout(timer)
  timer = setTimeout(run, 300)
}

await run()
watch('collection.json', schedule)
spawn('vite', { stdio: 'inherit' })
