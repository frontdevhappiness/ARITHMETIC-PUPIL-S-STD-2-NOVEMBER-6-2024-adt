import fs from "node:fs"
import path from "node:path"
import { createTTSSynthesizer } from "/home/echad/Documents/Projects/adt-studio/packages/llm/dist/speech.js"
import { generateSpeechFile } from "/home/echad/Documents/Projects/adt-studio/packages/pipeline/dist/speech.js"

const root = "/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt"
const staging = `${root}/.audit/tts-output`
const packaged = `${root}/content/i18n/en-GB/audio`
const numbers = process.argv.slice(2).map(Number)
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

const synthesizer = createTTSSynthesizer()
for (const number of numbers) {
  const result = await generateSpeechFile({
    textId: `stdnum_enGB_b2fix_${number}`,
    text: britishNumber(number),
    language: "en-GB",
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    instructions: "Pause briefly, then say only the supplied number words once, clearly and naturally for a young learner. Do not add any words or read punctuation.",
    format: "mp3",
    bookDir: staging,
    cacheDir: `${root}/.audit/tts-cache`,
    ttsSynthesizer: synthesizer,
    provider: "openai",
  })
  fs.copyFileSync(
    path.join(staging, "audio", "en-GB", result.fileName),
    path.join(packaged, `stdnum_enGB_${number}.mp3`),
  )
  console.log(`${number}: ${britishNumber(number)}`)
}
