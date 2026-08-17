import fs from "node:fs"
import path from "node:path"
import { createTTSSynthesizer } from "/home/echad/Documents/Projects/adt-studio/packages/llm/dist/speech.js"
import { generateSpeechFile } from "/home/echad/Documents/Projects/adt-studio/packages/pipeline/dist/speech.js"

const bookRoot = "/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt"
const stagingRoot = `${bookRoot}/.audit/tts-output`
const packagedAudio = `${bookRoot}/content/i18n/en-GB/audio`
const start = Number(process.argv[2])
const end = Number(process.argv[3])

if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > 999) {
  throw new Error("Usage: node .audit/generate_standard_number_audio.mjs START END (0–999)")
}

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

const jobs = Array.from({ length: end - start + 1 }, (_, offset) => {
  const number = start + offset
  return {
    textId: `stdnum_enGB_${number}`,
    text: `${britishNumber(number)}.`,
  }
})

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
          instructions: "Speak in a cheerful and positive tone. Read the supplied text exactly without adding or omitting words.",
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
    console.log(JSON.stringify({ number: job.textId, output: packagedPath }))
  }
}

await Promise.all(Array.from({ length: Math.min(20, jobs.length) }, () => worker()))
