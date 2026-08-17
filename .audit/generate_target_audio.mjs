import fs from "node:fs"
import path from "node:path"
import { createTTSSynthesizer } from "/home/echad/Documents/Projects/adt-studio/packages/llm/dist/speech.js"
import { generateSpeechFile } from "/home/echad/Documents/Projects/adt-studio/packages/pipeline/dist/speech.js"

if (!process.env.OPENAI_API_KEY) {
  process.loadEnvFile("/home/echad/Documents/Projects/adt-studio/.env")
}

const root = "/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt"
const staging = `${root}/.audit/tts-output`
const packaged = `${root}/content/i18n/en-GB/audio`
const texts = JSON.parse(fs.readFileSync(`${root}/content/i18n/en-GB/texts.json`, "utf8"))
const requested = process.argv.slice(2)
const units = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
  "eighteen", "nineteen",
]
const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]

function numberWords(number) {
  if (number < 20) return units[number]
  if (number < 100) return `${tens[Math.floor(number / 10)]}${number % 10 ? `-${units[number % 10]}` : ""}`
  const remainder = number % 100
  return `${units[Math.floor(number / 100)]} hundred${remainder ? ` and ${numberWords(remainder)}` : ""}`
}

function spokenText(text) {
  const spoken = text
    .replace(/\s*\[\[blank:[^\]]+\]\]/g, "")
    .replace(/^(\d{1,2})\.\s*/, (_, number) => `${numberWords(Number(number))}. `)
    .replace(/\b\d{3}\b/g, (match) => numberWords(Number(match)))
    .replace(/\+/g, " plus ")
    .replace(/=/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return /[.!?]$/.test(spoken) ? spoken : `${spoken}.`
}

const jobs = []
for (const baseId of requested) {
  for (const textId of [baseId, `${baseId}_easy_read`]) {
    if (texts[textId]) jobs.push({ textId, text: spokenText(texts[textId]) })
  }
}

console.error(`Generating ${jobs.length} targeted clips`)
const synthesizer = createTTSSynthesizer()
let next = 0

async function worker() {
  while (next < jobs.length) {
    const job = jobs[next++]
    const result = await generateSpeechFile({
      ...job,
      language: "en-GB",
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      instructions: "Speak clearly, slowly, and warmly for a young learner. Read the supplied text exactly once without adding or omitting words. Use standard British number pronunciation.",
      format: "mp3",
      bookDir: staging,
      cacheDir: `${root}/.audit/tts-cache`,
      ttsSynthesizer: synthesizer,
      provider: "openai",
    })
    fs.copyFileSync(
      path.join(staging, "audio", "en-GB", result.fileName),
      path.join(packaged, result.fileName),
    )
    console.log(JSON.stringify({ textId: job.textId, spoken: job.text, fileName: result.fileName }))
  }
}

await Promise.all(Array.from({ length: Math.min(8, jobs.length) }, () => worker()))
