import fs from "node:fs"
import path from "node:path"

const root = "/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt"
const pages = [
  "pg017_sec001.html", "pg018_sec001.html", "qz003.html", "pg019_sec001.html",
  "pg020_sec001.html", "pg021_sec001.html", "pg022_sec001.html", "qz004.html",
  "pg024_sec001.html", "pg025_sec001.html",
]
const texts = JSON.parse(fs.readFileSync(`${root}/content/i18n/en-GB/texts.json`, "utf8"))
const audios = JSON.parse(fs.readFileSync(`${root}/content/i18n/en-GB/audios.json`, "utf8"))
const key = process.env.OPENAI_API_KEY
if (!key) throw new Error("OPENAI_API_KEY is required")

const baseIds = new Set()
for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), "utf8")
  for (const match of html.matchAll(/data-id=["']([^"']+)/g)) {
    const id = match[1]
    if (!/^qz\d+$/.test(id) && !/_im\d|_seg\d/.test(id) && /\b\d{3}\b/.test(texts[id] || "")) baseIds.add(id)
  }
}
const jobs = []
const requestedIds = new Set(process.argv.slice(2))
for (const baseId of baseIds) {
  if (requestedIds.size && !requestedIds.has(baseId)) continue
  for (const textId of [baseId, `${baseId}_easy_read`]) {
    if (texts[textId] && audios[textId]) jobs.push(textId)
  }
}

const results = {}
const failures = []
let next = 0

async function transcribe(textId) {
  const audio = fs.readFileSync(`${root}/content/i18n/en-GB/audio/${audios[textId]}`)
  const form = new FormData()
  form.set("file", new Blob([audio], { type: "audio/mpeg" }), audios[textId])
  form.set("model", "whisper-1")
  form.set("response_format", "verbose_json")
  form.append("timestamp_granularities[]", "word")
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: form,
        signal: AbortSignal.timeout(30_000),
      })
      if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`)
      return response.json()
    } catch (error) {
      if (attempt === 4) throw error
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
    }
  }
}

async function worker() {
  while (next < jobs.length) {
    const textId = jobs[next++]
    try {
      const transcript = await transcribe(textId)
      results[textId] = {
        transcript: transcript.text,
        words: (transcript.words ?? []).map(({ word, start, end }) => ({
          text: word.trim(), start, end,
        })).filter(({ text }) => text),
      }
    } catch (error) {
      failures.push({ textId, error: String(error) })
    }
  }
}

await Promise.all(Array.from({ length: Math.min(10, jobs.length) }, () => worker()))
fs.writeFileSync("/tmp/batch3_composite_timecodes.json", JSON.stringify(results, null, 2))
console.log(JSON.stringify({ checked: jobs.length, written: Object.keys(results).length, failures }, null, 2))
if (failures.length) process.exitCode = 1
