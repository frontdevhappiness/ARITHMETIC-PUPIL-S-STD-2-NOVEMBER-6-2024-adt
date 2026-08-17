import fs from "node:fs"

const root = "/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt"
const texts = JSON.parse(fs.readFileSync(`${root}/content/i18n/en-GB/texts.json`, "utf8"))
const audios = JSON.parse(fs.readFileSync(`${root}/content/i18n/en-GB/audios.json`, "utf8"))
const key = process.env.OPENAI_API_KEY
if (!key) throw new Error("OPENAI_API_KEY is required")

const baseIds = [
  "qz001_que", "qz001_o0", "qz001_o0_exp", "qz001_o1", "qz001_o1_exp", "qz001_o2", "qz001_o2_exp",
  "pg010_n0005", "pg010_n0221", "pg011_n0005", "pg011_n0221", "pg012_n0003", "pg012_n0006",
  "qz002_que", "qz002_o0", "qz002_o0_exp", "qz002_o1", "qz002_o1_exp", "qz002_o2", "qz002_o2_exp",
  "pg014_n0002", "pg016_n0011", "pg016_n0012", "pg016_n0019", "pg016_n0027", "pg016_n0035",
  "pg016_n0043", "pg017_n0007", "pg017_n0010",
]
const jobs = []
for (const baseId of baseIds) {
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
fs.writeFileSync("/tmp/batch2_composite_timecodes.json", JSON.stringify(results, null, 2))
console.log(JSON.stringify({ checked: jobs.length, written: Object.keys(results).length, failures }, null, 2))
if (failures.length) process.exitCode = 1
