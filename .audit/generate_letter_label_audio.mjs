import { createTTSSynthesizer } from "/home/echad/Documents/Projects/adt-studio/packages/llm/dist/speech.js"
import { generateSpeechFile } from "/home/echad/Documents/Projects/adt-studio/packages/pipeline/dist/speech.js"

const bookRoot = "/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt"

const labels = {
  pg133_n0013: "A",
  pg133_n0015: "B",
  pg133_n0020: "A",
  pg133_n0022: "B",
  pg136_n0025: "A",
  pg136_n0028: "B",
  pg136_n0031: "C",
  pg136_n0035: "D",
  pg136_n0038: "E",
  pg136_n0041: "F",
  pg136_n0045: "G",
  pg136_n0048: "H",
  pg136_n0051: "I",
}

const jobs = Object.entries(labels).flatMap(([textId, letter]) => [
  { textId, text: `Letter ${letter}.` },
  { textId: `${textId}_easy_read`, text: `Letter ${letter}.` },
])

for (const job of jobs) {
  const result = await generateSpeechFile({
    ...job,
    language: "en-GB",
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    instructions: "Speak clearly and warmly for a Standard Two pupil. Pronounce the named letter distinctly.",
    format: "mp3",
    bookDir: `${bookRoot}/content/i18n`,
    cacheDir: `${bookRoot}/.audit/tts-cache`,
    ttsSynthesizer: createTTSSynthesizer(),
    provider: "openai",
  })
  console.log(JSON.stringify(result))
}
