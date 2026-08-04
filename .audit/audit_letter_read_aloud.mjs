import { pathToFileURL } from "node:url"

const { chromium } = await import("/home/echad/Documents/Projects/adt-studio/node_modules/.pnpm/playwright@1.58.2/node_modules/playwright/index.mjs")

const root = "/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt"
const pages = [
  {
    file: "pg133_sec001.html",
    labels: ["pg133_n0013", "pg133_n0015", "pg133_n0020", "pg133_n0022"],
  },
  {
    file: "pg136_sec002.html",
    labels: [
      "pg136_n0025", "pg136_n0028", "pg136_n0031", "pg136_n0035",
      "pg136_n0038", "pg136_n0041", "pg136_n0045", "pg136_n0048", "pg136_n0051",
    ],
  },
]

const browser = await chromium.launch({
  headless: true,
  executablePath: "/snap/bin/chromium",
  args: ["--no-sandbox", "--allow-file-access-from-files"],
})

try {
  const context = await browser.newContext()
  const page = await context.newPage()
  const results = []

  for (const target of pages) {
    await page.goto(pathToFileURL(`${root}/${target.file}`).href, { waitUntil: "load" })
    await page.waitForSelector("#content [data-id]")
    const result = await page.evaluate(async labels => {
      const audioMap = await (await fetch("./content/i18n/en-GB/audios.json")).json()
      const queue = [...document.querySelectorAll("#content [data-id]")]
        .map(element => ({
          id: element.getAttribute("data-id"),
          tag: element.tagName.toLowerCase(),
          text: (element.textContent || element.getAttribute("alt") || "").trim(),
        }))
        .filter(item => audioMap[item.id])

      const durations = {}
      for (const id of labels) {
        const filename = audioMap[id]
        durations[id] = await new Promise(resolve => {
          const audio = new Audio(`./content/i18n/en-GB/audio/${filename}`)
          audio.addEventListener("loadedmetadata", () => resolve(audio.duration), { once: true })
          audio.addEventListener("error", () => resolve(null), { once: true })
          audio.load()
        })
      }
      return {
        describeImagesMode: localStorage.getItem("describeImagesMode"),
        queue,
        labelQueueIndexes: Object.fromEntries(labels.map(id => [id, queue.findIndex(item => item.id === id)])),
        durations,
      }
    }, target.labels)
    results.push({ page: target.file, ...result })
  }

  console.log(JSON.stringify(results, null, 2))
} finally {
  await browser.close()
}
