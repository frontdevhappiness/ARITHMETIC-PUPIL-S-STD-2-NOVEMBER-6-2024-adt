import { createTTSSynthesizer } from "/home/echad/Documents/Projects/adt-studio/packages/llm/dist/speech.js"
import { generateSpeechFile } from "/home/echad/Documents/Projects/adt-studio/packages/pipeline/dist/speech.js"

const bookRoot = "/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt"
const jobs = [
  {
    textId: "pg114_blank",
    text: "blank",
  },
  {
    textId: "pg139_im005",
    text: "Nine labelled plane figures: rectangle a, trapezium b, circle c, irregular four-sided shape d, triangle e, hexagon f, pentagon g, triangle h and parallelogram i.",
  },
]

for (const job of jobs) {
  const result = await generateSpeechFile({
    ...job,
    language: "en-GB",
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    instructions: "Speak clearly and warmly for a Standard Two pupil.",
    format: "mp3",
    bookDir: `${bookRoot}/content/i18n`,
    cacheDir: `${bookRoot}/.audit/tts-cache`,
    ttsSynthesizer: createTTSSynthesizer(),
    provider: "openai",
  })
  console.log(JSON.stringify(result))
}
