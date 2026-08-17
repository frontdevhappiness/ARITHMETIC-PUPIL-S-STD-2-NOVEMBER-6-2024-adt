import fs from "node:fs"

const root = "/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt"
const texts = JSON.parse(fs.readFileSync(`${root}/content/i18n/en-GB/texts.json`, "utf8"))
const results = JSON.parse(fs.readFileSync("/tmp/batch3_composite_timecodes.json", "utf8"))
const units = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
  "eighteen", "nineteen",
]
const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]

function numberWords(number) {
  if (number < 20) return units[number]
  if (number < 100) return `${tens[Math.floor(number / 10)]}${number % 10 ? ` ${units[number % 10]}` : ""}`
  const remainder = number % 100
  return `${units[Math.floor(number / 100)]} hundred${remainder ? ` and ${numberWords(remainder)}` : ""}`
}

function normalize(text) {
  return text
    .replace(/\[\[blank:[^\]]+\]\]/g, "blank")
    .replace(/\b\d{1,3}\b/g, (match) => numberWords(Number(match)))
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .trim()
}

const failures = []
for (const [textId, result] of Object.entries(results)) {
  const expected = normalize(texts[textId])
  const transcript = normalize(result.transcript)
  if (expected !== transcript) failures.push({ textId, expected, transcript, raw: result.transcript })
}
console.log(JSON.stringify({ checked: Object.keys(results).length, failures }, null, 2))
if (failures.length) process.exitCode = 1
