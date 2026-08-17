import fs from "node:fs"
import path from "node:path"
import { createTTSSynthesizer } from "/home/echad/Documents/Projects/adt-studio/packages/llm/dist/speech.js"
import { generateSpeechFile } from "/home/echad/Documents/Projects/adt-studio/packages/pipeline/dist/speech.js"

const bookRoot = "/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt"
const stagingRoot = `${bookRoot}/.audit/tts-output`
const packagedAudio = `${bookRoot}/content/i18n/en-GB/audio`
const texts = JSON.parse(fs.readFileSync(`${bookRoot}/content/i18n/en-GB/texts.json`, "utf8"))

const baseIds = [
  "qz001_que", "qz001_o0", "qz001_o0_exp", "qz001_o1", "qz001_o1_exp", "qz001_o2", "qz001_o2_exp",
  "pg010_n0005", "pg010_n0221", "pg011_n0005", "pg011_n0221",
  "pg012_n0003", "pg012_n0006",
  "qz002_que", "qz002_o0", "qz002_o0_exp", "qz002_o1", "qz002_o1_exp", "qz002_o2", "qz002_o2_exp",
  "pg014_n0002",
  "pg016_n0011", "pg016_n0012", "pg016_n0019", "pg016_n0027",
  "pg016_n0035", "pg016_n0043", "pg017_n0007", "pg017_n0010",
]

const units = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
  "eighteen", "nineteen",
]
const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]

function belowHundred(number) {
  if (number < 20) return units[number]
  const ten = Math.floor(number / 10)
  const unit = number % 10
  return unit ? `${tens[ten]}-${units[unit]}` : tens[ten]
}

function britishNumber(number) {
  if (number < 100) return belowHundred(number)
  const hundred = Math.floor(number / 100)
  const remainder = number % 100
  return remainder
    ? `${units[hundred]} hundred and ${belowHundred(remainder)}`
    : `${units[hundred]} hundred`
}

function spokenText(text) {
  return text.replace(/\b\d{3}\b/g, (match) => britishNumber(Number(match)))
}

const jobs = []
for (const baseId of baseIds) {
  for (const textId of [baseId, `${baseId}_easy_read`]) {
    if (!texts[textId]) continue
    jobs.push({ textId, text: spokenText(texts[textId]) })
  }
}

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
          instructions: "Speak clearly, smoothly, and warmly for a young learner. Read the supplied text exactly without adding or omitting words.",
          format: "mp3",
          bookDir: stagingRoot,
          cacheDir: `${bookRoot}/.audit/tts-cache`,
          ttsSynthesizer: synthesizer,
          provider: "openai",
        })
        break
      } catch (error) {
        if (attempt === 4) throw error
        console.warn(JSON.stringify({ retry: job.textId, attempt }))
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
      }
    }
    const stagedPath = path.join(stagingRoot, "audio", "en-GB", result.fileName)
    const packagedPath = path.join(packagedAudio, result.fileName)
    fs.mkdirSync(packagedAudio, { recursive: true })
    fs.copyFileSync(stagedPath, packagedPath)
    console.log(JSON.stringify({ textId: job.textId, spoken: job.text, output: packagedPath }))
  }
}

await Promise.all(Array.from({ length: Math.min(10, jobs.length) }, () => worker()))
