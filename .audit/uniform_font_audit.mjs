import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

const { chromium } = await import("/home/echad/Documents/Projects/adt-studio/node_modules/.pnpm/playwright@1.58.2/node_modules/playwright/index.mjs")
const root = "/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt"
const entries = JSON.parse(fs.readFileSync(path.join(root, "content/pages.json"), "utf8"))
const browser = await chromium.launch({
  headless: true,
  executablePath: "/snap/bin/chromium",
  args: ["--allow-file-access-from-files", "--disable-dev-shm-usage", "--no-sandbox"],
})
let page = await browser.newPage({ viewport: { width: 1100, height: 900 } })
const results = []

for (const [index, entry] of entries.entries()) {
  if (index > 0 && index % 30 === 0) {
    await page.close()
    page = await browser.newPage({ viewport: { width: 1100, height: 900 } })
  }
  const url = new URL(pathToFileURL(path.join(root, entry.href)).href)
  url.searchParams.set("embed", "1")
  await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 15000 })
  await page.waitForTimeout(250)
  const result = await page.evaluate(() => {
    const sourceCoverSizes = {
      pg001_n0002: 75,
      pg001_n0003: 39,
      pg001_n0004: 45,
      pg001_n0019: 23,
    }
    const nodes = [...document.querySelectorAll("#content, #content *")]
      .filter((element) => {
        const style = getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        if (style.display === "none" || style.visibility === "hidden" || rect.width <= 0 || rect.height <= 0) return false
        const directText = [...element.childNodes].some(
          (node) => node.nodeType === Node.TEXT_NODE && /\S/.test(node.textContent || ""),
        )
        return directText || ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "OPTION"].includes(element.tagName)
      })
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        dataId: element.getAttribute("data-id"),
        text: (element.textContent || element.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 100),
        fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
        expectedFontSize: sourceCoverSizes[element.getAttribute("data-id")] || 22,
      }))
    return {
      checked: nodes.length,
      deviations: nodes.filter((node) => Math.abs(node.fontSize - node.expectedFontSize) > 0.05),
    }
  })
  results.push({ ...entry, ...result })
  if ((index + 1) % 30 === 0 || index + 1 === entries.length) console.log(`${index + 1}/${entries.length}`)
}

await page.close()
await browser.close()
const summary = {
  entries: results.length,
  textElementsChecked: results.reduce((sum, result) => sum + result.checked, 0),
  entriesWithDeviations: results.filter((result) => result.deviations.length).length,
  deviations: results.reduce((sum, result) => sum + result.deviations.length, 0),
}
fs.writeFileSync(path.join(root, ".audit", "uniform-font-report.json"), `${JSON.stringify({ summary, results }, null, 2)}\n`)
console.log(JSON.stringify(summary, null, 2))
