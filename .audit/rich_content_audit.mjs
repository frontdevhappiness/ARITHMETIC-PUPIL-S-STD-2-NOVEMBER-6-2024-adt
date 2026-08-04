import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

const { chromium } = await import("/home/echad/Documents/Projects/adt-studio/node_modules/.pnpm/playwright@1.58.2/node_modules/playwright/index.mjs")
const root = "/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt"
const manifest = JSON.parse(fs.readFileSync(path.join(root, "content/pages.json"), "utf8"))
const entries = manifest.filter((entry) => entry.href.endsWith(".html"))
const texts = JSON.parse(fs.readFileSync(path.join(root, "content/i18n/en-GB/texts.json"), "utf8"))

const browser = await chromium.launch({
  headless: true,
  executablePath: "/snap/bin/chromium",
  args: ["--allow-file-access-from-files", "--disable-dev-shm-usage", "--no-sandbox"],
})
const staticContext = await browser.newContext({ javaScriptEnabled: false })
const runtimeContext = await browser.newContext()
const staticPage = await staticContext.newPage()
const runtimePage = await runtimeContext.newPage()
const failures = []
let checked = 0

for (const entry of entries) {
  const url = pathToFileURL(path.join(root, entry.href)).href
  await staticPage.goto(url, { waitUntil: "domcontentloaded" })
  const expected = await staticPage.evaluate((knownIds) =>
    Array.from(document.querySelectorAll("[data-id]"))
      .filter((element) => knownIds.includes(element.dataset.id) && element.childElementCount > 0)
      .map((element) => element.dataset.id),
  Object.keys(texts))
  if (expected.length === 0) continue

  checked += expected.length
  await runtimePage.goto(`${url}?embed=1`, { waitUntil: "domcontentloaded" })
  await runtimePage.waitForTimeout(700)
  const flattened = await runtimePage.evaluate((ids) =>
    ids.filter((id) => document.querySelector(`[data-id="${CSS.escape(id)}"]`)?.childElementCount === 0),
  expected)
  if (flattened.length > 0) failures.push({ href: entry.href, dataIds: flattened })
}

await staticContext.close()
await runtimeContext.close()
await browser.close()

const report = { checked, failures }
fs.writeFileSync(path.join(root, ".audit/rich-content-report.json"), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({ checked, flattened: failures.reduce((sum, item) => sum + item.dataIds.length, 0), pages: failures.length }, null, 2))
