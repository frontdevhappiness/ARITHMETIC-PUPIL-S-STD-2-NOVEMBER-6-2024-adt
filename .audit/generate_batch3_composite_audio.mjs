import fs from "node:fs"
import path from "node:path"
import { createTTSSynthesizer } from "/home/echad/Documents/Projects/adt-studio/packages/llm/dist/speech.js"
import { generateSpeechFile } from "/home/echad/Documents/Projects/adt-studio/packages/pipeline/dist/speech.js"

const root = "/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt"
const staging = `${root}/.audit/tts-output`
const packaged = `${root}/content/i18n/en-GB/audio`
const pages = [
  "pg017_sec001.html", "pg018_sec001.html", "qz003.html", "pg019_sec001.html",
  "pg020_sec001.html", "pg021_sec001.html", "pg022_sec001.html", "qz004.html",
  "pg024_sec001.html", "pg025_sec001.html",
]
const texts = JSON.parse(fs.readFileSync(`${root}/content/i18n/en-GB/texts.json`, "utf8"))
const units = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
  "eighteen", "nineteen",
]
const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]

function belowHundred(number) {
  if (number < 20) return units[number]
  return `${tens[Math.floor(number / 10)]}${number % 10 ? `-${units[number % 10]}` : ""}`
}

function britishNumber(number) {
  if (number < 100) return belowHundred(number)
  const remainder = number % 100
  return `${units[Math.floor(number / 100)]} hundred${remainder ? ` and ${belowHundred(remainder)}` : ""}`
}

function spokenText(text) {
  const spoken = text
    .replace(/(\d{3})\s+(?=\d{3}\b)/g, "$1, ")
    .replace(/\[\[blank:[^\]]+\]\]/g, "blank")
    .replace(/\b\d{3}\b/g, (match) => britishNumber(Number(match)))
  return /[.!?]$/.test(spoken.trim()) ? spoken : `${spoken}.`
}

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
    if (texts[textId]) jobs.push({ textId, text: spokenText(texts[textId]) })
  }
}

console.error(`Generating ${jobs.length} batch-3 clips`)
const synthesizer = createTTSSynthesizer()
let next = 0

async function worker() {
  while (next < jobs.length) {
    const job = jobs[next++]
    let result
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        result = await generateSpeechFile({
          ...job,
          language: "en-GB",
          model: "gpt-4o-mini-tts",
          voice: "alloy",
          instructions: "Speak clearly, slowly, and warmly for a young learner. Read every supplied item exactly once without adding or omitting words. Pause briefly between list items. Use standard British number pronunciation.",
          format: "mp3",
          bookDir: staging,
          cacheDir: `${root}/.audit/tts-cache`,
          ttsSynthesizer: synthesizer,
          provider: "openai",
        })
        break
      } catch (error) {
        if (attempt === 4) throw error
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
      }
    }
    fs.copyFileSync(
      path.join(staging, "audio", "en-GB", result.fileName),
      path.join(packaged, result.fileName),
    )
    console.log(JSON.stringify({ textId: job.textId, spoken: job.text, fileName: result.fileName }))
  }
}

await Promise.all(Array.from({ length: Math.min(10, jobs.length) }, () => worker()))
