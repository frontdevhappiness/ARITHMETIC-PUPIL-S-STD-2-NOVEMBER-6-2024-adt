import fs from "node:fs"
import path from "node:path"

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..")
const pages = [
  "pg017_sec001.html", "pg018_sec001.html", "qz003.html", "pg019_sec001.html",
  "pg020_sec001.html", "pg021_sec001.html", "pg022_sec001.html", "qz004.html",
  "pg024_sec001.html", "pg025_sec001.html",
]
const localeRoot = path.join(root, "content/i18n/en-GB")
const texts = JSON.parse(fs.readFileSync(path.join(localeRoot, "texts.json"), "utf8"))
const audios = JSON.parse(fs.readFileSync(path.join(localeRoot, "audios.json"), "utf8"))
const timecodes = JSON.parse(fs.readFileSync(path.join(localeRoot, "timecode/timecode_output.json"), "utf8"))
const ids = new Map()

for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), "utf8")
  for (const match of html.matchAll(/data-id=["']([^"']+)/g)) {
    if (/^qz\d+$/.test(match[1])) continue
    if (!ids.has(match[1])) ids.set(match[1], page)
  }
}

const report = { labels: [], numberTexts: [], images: [], missing: [] }
for (const [id, page] of ids) {
  const value = (texts[id] || "").trim()
  const candidates = [id, `${id}_easy_read`].filter((candidate) => candidate in texts)
  if (/^\d{1,2}\.$/.test(value)) {
    report.labels.push({ page, id, value, audio: audios[id], words: timecodes[id]?.timecodes?.[1]?.word_timestamps?.map((word) => word.text) })
  }
  if (/\b\d{3}\b/.test(value)) {
    report.numberTexts.push({ page, id, value, audio: audios[id] })
  }
  if (/_im\d|_seg\d/.test(id)) report.images.push({ page, id, value })
  for (const candidate of candidates) {
    if (!audios[candidate]) report.missing.push({ page, id: candidate, problem: "audio mapping" })
    else if (!fs.existsSync(path.join(localeRoot, "audio", audios[candidate]))) report.missing.push({ page, id: candidate, problem: `audio file ${audios[candidate]}` })
    if (!timecodes[candidate]) report.missing.push({ page, id: candidate, problem: "timecodes" })
  }
}

console.log(JSON.stringify(report, null, 2))
