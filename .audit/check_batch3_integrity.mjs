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
const failures = []
let checked = 0

function checkTextId(page, textId) {
  if (/^qz\d+$/.test(textId)) return
  checked += 1
  if (!(textId in texts)) {
    failures.push(`${page}: missing text ${textId}`)
    return
  }
  for (const candidate of [textId, `${textId}_easy_read`].filter((id) => id in texts)) {
    const audio = audios[candidate]
    if (!audio) failures.push(`${candidate}: missing audio mapping`)
    else if (!fs.existsSync(path.join(localeRoot, "audio", audio))) failures.push(`${candidate}: missing ${audio}`)
    if (!timecodes[candidate]) failures.push(`${candidate}: missing timestamps`)
  }
  const value = texts[textId].trim()
  if (/^\d{1,2}\.$/.test(value)) {
    const number = value.slice(0, -1)
    for (const candidate of [textId, `${textId}_easy_read`].filter((id) => id in texts)) {
      if (audios[candidate] !== `stdnum_enGB_${number}.mp3`) failures.push(`${candidate}: non-standard label audio`)
      const words = timecodes[candidate]?.timecodes?.[1]?.word_timestamps ?? []
      if (words.length !== 1 || words[0].text !== number) failures.push(`${candidate}: invalid label highlighting`)
    }
  }
}

for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), "utf8")
  const ids = new Set([...html.matchAll(/data-id=["']([^"']+)/g)].map((match) => match[1]))
  for (const id of ids) checkTextId(page, id)
}

const removedImageIds = [
  "pg018_im001", "pg018_im003", "pg020_im002", "pg020_im003", "pg020_im005",
  "pg021_im002", "pg021_im003", "pg021_im004", "pg021_im005", "pg021_im007_seg003_v1", "pg021_im008_seg003_v1",
]
for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), "utf8")
  for (const id of removedImageIds) {
    if (html.includes(`data-id="${id}"`) || html.includes(`data-id='${id}'`)) failures.push(`${page}: duplicate image narration ${id}`)
  }
}

const bookwideIds = new Set()
for (const page of fs.readdirSync(root).filter((name) => name.endsWith(".html"))) {
  const html = fs.readFileSync(path.join(root, page), "utf8")
  for (const match of html.matchAll(/data-id=["']([^"']+)/g)) {
    if (["8.", "19."].includes((texts[match[1]] || "").trim())) bookwideIds.add(match[1])
  }
}
for (const textId of bookwideIds) {
  const number = texts[textId].trim().slice(0, -1)
  for (const candidate of [textId, `${textId}_easy_read`].filter((id) => id in texts)) {
    if (audios[candidate] !== `stdnum_enGB_${number}.mp3`) failures.push(`${candidate}: book-wide label not standardised`)
    const words = timecodes[candidate]?.timecodes?.[1]?.word_timestamps ?? []
    if (words.length !== 1 || words[0].text !== number) failures.push(`${candidate}: book-wide label highlighting invalid`)
  }
}

console.log(JSON.stringify({ checkedDataIds: checked, bookwideLabels8And19: bookwideIds.size, failures }, null, 2))
if (failures.length) process.exitCode = 1
