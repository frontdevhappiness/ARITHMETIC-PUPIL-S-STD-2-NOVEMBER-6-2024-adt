import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..")
const localeRoot = path.join(root, "content/i18n/en-GB")
const texts = JSON.parse(fs.readFileSync(path.join(localeRoot, "texts.json"), "utf8"))
const audios = JSON.parse(fs.readFileSync(path.join(localeRoot, "audios.json"), "utf8"))
const timecodePath = path.join(localeRoot, "timecode/timecode_output.json")
const output = JSON.parse(fs.readFileSync(timecodePath, "utf8"))
const includeMathSymbols = process.argv.includes("--read-equals")
const requested = process.argv.slice(2).filter((argument) => argument !== "--read-equals")

function spokenTokens(value) {
  const cleaned = value.replace(/\[\[blank:[^\]]+\]\]/g, " ").trim()
  if (/^\d+[.]?$/.test(cleaned)) return [cleaned.replace(/[.]$/, "")]
  const tokenPattern = includeMathSymbols
    ? /[A-Za-z]+(?:'[A-Za-z]+)?|\d+|[+=]/g
    : /[A-Za-z]+(?:'[A-Za-z]+)?|\d+/g
  return cleaned.replace(/[–—-]/g, " ").match(tokenPattern) ?? []
}

for (const baseId of requested) {
  for (const id of [baseId, `${baseId}_easy_read`]) {
    if (!(id in texts) || !(id in audios)) continue
    const audioPath = path.join(localeRoot, "audio", audios[id])
    if (!fs.existsSync(audioPath)) throw new Error(`Missing audio: ${audioPath}`)
    const duration = Number(execFileSync("ffprobe", [
      "-v", "error", "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1", audioPath,
    ], { encoding: "utf8" }).trim())
    const tokens = spokenTokens(texts[id])
    const usableDuration = Math.max(0, duration - 0.08)
    const weights = tokens.map((token) => Math.max(1, Math.sqrt(token.length)))
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
    let cursor = 0
    const wordTimestamps = tokens.map((token, index) => {
      const start = cursor
      cursor = index === tokens.length - 1
        ? usableDuration
        : cursor + usableDuration * (weights[index] / totalWeight)
      return { text: token, start, end: cursor }
    })
    output[id] = { timecodes: [null, { word_timestamps: wordTimestamps }] }
    console.log(`${id}: ${tokens.join(" ")} (${duration.toFixed(2)}s)`)
  }
}

fs.writeFileSync(timecodePath, `${JSON.stringify(output, null, 2)}\n`)
