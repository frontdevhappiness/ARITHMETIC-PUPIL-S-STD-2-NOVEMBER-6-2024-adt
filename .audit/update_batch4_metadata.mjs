import fs from "node:fs"

const root = new URL("../", import.meta.url).pathname
const localeRoot = `${root}content/i18n/en-GB`
const textsPath = `${localeRoot}/texts.json`
const audiosPath = `${localeRoot}/audios.json`
const timecodesPath = `${localeRoot}/timecode/timecode_output.json`
const texts = JSON.parse(fs.readFileSync(textsPath, "utf8"))
const audios = JSON.parse(fs.readFileSync(audiosPath, "utf8"))
const timecodes = JSON.parse(fs.readFileSync(timecodesPath, "utf8"))

const updates = {
  pg026_n0013: "324. Ones. Tens. Hundreds.",
  pg026_upload1: "Place-value diagram showing the number 224 with guide lines to three answer spaces.",
  pg026_upload2: "Place-value diagram showing the number 185 with guide lines to three answer spaces.",
  pg026_upload3: "Place-value diagram showing the number 402 with guide lines to three answer spaces.",
  pg026_upload4: "Place-value diagram showing the number 306 with guide lines to three answer spaces.",
  pg026_upload5: "Place-value diagram showing the number 247 with guide lines to three answer spaces.",
  pg026_upload6: "Place-value diagram showing the number 87 with guide lines to two answer spaces.",
  pg026_upload7: "Place-value diagram showing the number 93 with guide lines to two answer spaces.",
  pg026_upload8: "Place-value diagram showing the number 210 with guide lines to three answer spaces.",
  pg026_upload9: "Place-value diagram showing the number 179 with guide lines to three answer spaces.",
  pg026_upload10: "Place-value diagram showing the number 500 with guide lines to three answer spaces.",
  pg028_n0022: "4 hundreds, 7 tens, 8 ones.",
  pg029_n0005: "3 hundreds, 9 tens, 5 ones.",
  pg029_n0017: "3 hundreds, 1 ten, 2 ones.",
  pg029_n0020: "1 hundred, 0 tens, 8 ones.",
  pg029_n0024: "4 hundreds, 2 tens, 5 ones.",
  pg029_n0027: "3 tens, 5 ones.",
  pg029_n0031: "2 hundreds, 1 ten, 5 ones.",
  pg029_n0034: "4 hundreds, 0 tens, 3 ones.",
  pg030_n0003: "5 hundreds, 0 tens, 0 ones.",
  pg030_n0005: "6 tens, 4 ones.",
  pg030_n0007: "6 ones.",
  pg030_n0009: "6 tens, 1 one.",
  pg030_n0011: "1 hundred, 3 tens, 2 ones.",
  pg030_n0013: "3 hundreds, 8 tens, 6 ones.",
  pg030_n0015: "2 hundreds, 9 tens, 4 ones.",
  pg030_n0017: "3 hundreds, 7 tens, 1 one.",
  pg031_im001: "Abacus showing 0 hundreds, 2 tens and 5 ones.",
  pg031_im002: "Abacus showing 2 hundreds, 2 tens and 5 ones.",
  pg031_im003: "Abacus showing 0 hundreds, 3 tens and 4 ones.",
  pg031_im004: "Abacus showing 4 hundreds, 0 tens and 4 ones.",
  pg031_im005: "Abacus showing 1 hundred, 4 tens and 3 ones.",
  pg031_im006: "Abacus showing 3 hundreds, 6 tens and 5 ones.",
}

for (const [id, value] of Object.entries(updates)) {
  texts[id] = value
  texts[`${id}_easy_read`] = value
  audios[id] = `${id}.mp3`
  audios[`${id}_easy_read`] = `${id}_easy_read.mp3`
}

const exerciseQuestionIds = [
  ...Array.from({ length: 10 }, (_, index) => `pg027_n${String(index + 17).padStart(4, "0")}`),
  ...Array.from({ length: 10 }, (_, index) => `pg028_n${String(index + 5).padStart(4, "0")}`),
  "pg032_n0042", "pg032_n0045", "pg032_n0048", "pg032_n0051", "pg032_n0054",
  "pg032_n0057", "pg032_n0060", "pg032_n0063", "pg032_n0066", "pg032_n0069",
  "pg033_n0007", "pg033_n0009", "pg033_n0011", "pg033_n0013", "pg033_n0015",
  "pg033_n0017", "pg033_n0019", "pg033_n0021", "pg033_n0023", "pg033_n0025",
]

for (const id of exerciseQuestionIds) {
  for (const textId of [id, `${id}_easy_read`]) {
    if (!texts[textId]) continue

    // Exercise equations retain the printed equals sign. The targeted TTS
    // generator deliberately removes it from the spoken form.
    const withoutEquals = texts[textId].replace(/\s*=\s*/g, " ").trim()
    texts[textId] = withoutEquals.includes("[[blank:")
      ? withoutEquals.replace(/\s*(\[\[blank:)/, " = $1")
      : `${withoutEquals} =`
  }
}

audios.pg030_n0038 = "stdnum_enGB_480.mp3"
audios.pg030_n0038_easy_read = "stdnum_enGB_480.mp3"
timecodes.pg030_n0038 = structuredClone(timecodes.pg011_n0174)
timecodes.pg030_n0038_easy_read = structuredClone(timecodes.pg011_n0174)

audios.pg032_n0048 = "stdnum_enGB_8.mp3"
audios.pg032_n0048_easy_read = "stdnum_enGB_8.mp3"
timecodes.pg032_n0048 = structuredClone(timecodes.pg032_n0062)
timecodes.pg032_n0048_easy_read = structuredClone(timecodes.pg032_n0062)

audios.pg031_im001_easy_read = audios.pg031_im001

fs.writeFileSync(textsPath, `${JSON.stringify(texts, null, 2)}\n`)
fs.writeFileSync(audiosPath, `${JSON.stringify(audios, null, 2)}\n`)
fs.writeFileSync(timecodesPath, `${JSON.stringify(timecodes, null, 2)}\n`)
console.log(`Updated ${Object.keys(updates).length} base narration entries.`)
