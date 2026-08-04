import { createTTSSynthesizer } from "/home/echad/Documents/Projects/adt-studio/packages/llm/dist/speech.js"
import { generateSpeechFile } from "/home/echad/Documents/Projects/adt-studio/packages/pipeline/dist/speech.js"

const bookRoot = "/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt"
const result = await generateSpeechFile({
  textId: "pg112_im002",
  text: "Three schoolchildren stand apart: one child is alone on the left, while the other two hold hands on the right, illustrating one-third and two-thirds.",
  language: "en-GB",
  model: "gpt-4o-mini-tts",
  voice: "alloy",
  instructions: "Speak in a cheerful and positive tone.",
  format: "mp3",
  bookDir: `${bookRoot}/content/i18n`,
  cacheDir: `${bookRoot}/.audit/tts-cache`,
  ttsSynthesizer: createTTSSynthesizer(),
  provider: "openai",
})

console.log(JSON.stringify(result))
