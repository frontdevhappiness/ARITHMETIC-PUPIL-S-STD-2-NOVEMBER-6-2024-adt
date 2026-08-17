import fs from "node:fs"

const root = "/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt"
const start = Number(process.argv[2])
const end = Number(process.argv[3])
const explicitNumbers = process.argv.slice(2).map(Number)
const key = process.env.OPENAI_API_KEY
if (!key) throw new Error("OPENAI_API_KEY is required")

const units = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
  "eighteen", "nineteen",
]
const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]

function belowHundred(number) {
  if (number < 20) return units[number]
  return `${tens[Math.floor(number / 10)]}${number % 10 ? ` ${units[number % 10]}` : ""}`
}

function britishNumber(number) {
  if (number < 100) return belowHundred(number)
  const remainder = number % 100
  return `${units[Math.floor(number / 100)]} hundred${remainder ? ` and ${belowHundred(remainder)}` : ""}`
}

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/\b\d{1,3}\b/g, (value) => britishNumber(Number(value)))
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

const jobs = explicitNumbers.length > 2
  ? explicitNumbers
  : Array.from({ length: end - start + 1 }, (_, index) => start + index)
const failures = []
let next = 0
let completed = 0

async function transcribe(number) {
  const audio = fs.readFileSync(`${root}/content/i18n/en-GB/audio/stdnum_enGB_${number}.mp3`)
  const form = new FormData()
  form.set("file", new Blob([audio], { type: "audio/mpeg" }), `stdnum_enGB_${number}.mp3`)
  form.set("model", "whisper-1")
  form.set("response_format", "json")
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: form,
        signal: AbortSignal.timeout(30_000),
      })
      if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`)
      return (await response.json()).text
    } catch (error) {
      if (attempt === 4) throw error
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
    }
  }
}

async function worker() {
  while (next < jobs.length) {
    const number = jobs[next++]
    try {
      const transcript = await transcribe(number)
      const expected = britishNumber(number)
      if (normalize(transcript) !== normalize(expected)) {
        failures.push({ number, expected, transcript })
      }
    } catch (error) {
      failures.push({ number, error: String(error) })
    }
    completed += 1
    if (completed % 100 === 0 || completed === jobs.length) {
      console.error(`validated ${completed}/${jobs.length}`)
    }
  }
}

await Promise.all(Array.from({ length: Math.min(20, jobs.length) }, () => worker()))
console.log(JSON.stringify({ checked: jobs.length, failures }, null, 2))
if (failures.length) process.exitCode = 1
