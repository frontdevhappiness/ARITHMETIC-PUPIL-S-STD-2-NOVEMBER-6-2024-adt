import fs from "node:fs"

const root = "/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt"
const texts = JSON.parse(fs.readFileSync(`${root}/content/i18n/en-GB/texts.json`, "utf8"))
const audios = JSON.parse(fs.readFileSync(`${root}/content/i18n/en-GB/audios.json`, "utf8"))
const key = process.env.OPENAI_API_KEY
if (!key) throw new Error("OPENAI_API_KEY is required")

const jobs = []
for (const baseId of process.argv.slice(2)) {
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
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`)
  return response.json()
}

async function worker() {
  while (next < jobs.length) {
    const textId = jobs[next++]
    try {
      const transcript = await transcribe(textId)
      results[textId] = {
        transcript: transcript.text,
        words: (transcript.words ?? []).map(({ word, start, end }) => ({ text: word.trim(), start, end })).filter(({ text }) => text),
      }
    } catch (error) {
      failures.push({ textId, error: String(error) })
    }
  }
}

await Promise.all(Array.from({ length: Math.min(8, jobs.length) }, () => worker()))
fs.writeFileSync("/tmp/target_timecodes.json", JSON.stringify(results, null, 2))
console.log(JSON.stringify({ checked: jobs.length, written: Object.keys(results).length, failures, transcripts: Object.fromEntries(Object.entries(results).map(([id, value]) => [id, value.transcript])) }, null, 2))
if (failures.length) process.exitCode = 1
