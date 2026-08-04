import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

const { chromium } = await import("/home/echad/Documents/Projects/adt-studio/node_modules/.pnpm/playwright@1.58.2/node_modules/playwright/index.mjs")
const root = "/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt"
const manifest = JSON.parse(fs.readFileSync(path.join(root, "content/pages.json"), "utf8"))
const entries = manifest.filter((entry) => entry.section_id.startsWith("pg"))
const browser = await chromium.launch({
  headless: true,
  executablePath: "/snap/bin/chromium",
  args: ["--allow-file-access-from-files", "--disable-dev-shm-usage", "--no-sandbox"],
})
let page = await browser.newPage({ viewport: { width: 1100, height: 900 } })
const results = []

for (const [index, entry] of entries.entries()) {
  if (index > 0 && index % 25 === 0) {
    await page.close()
    page = await browser.newPage({ viewport: { width: 1100, height: 900 } })
  }
  const url = new URL(pathToFileURL(path.join(root, entry.href)).href)
  url.searchParams.set("embed", "1")
  await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 15000 })
  await page.waitForTimeout(250)
  const elements = await page.evaluate(() => [...document.querySelectorAll("#content [data-id]")]
    .filter((element) => !["IMG", "SVG"].includes(element.tagName))
    .filter((element) => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0
    })
    .map((element) => {
      const style = getComputedStyle(element)
      return {
        dataId: element.getAttribute("data-id"),
        tag: element.tagName.toLowerCase(),
        text: (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 160),
        fontSize: Number.parseFloat(style.fontSize),
        lineHeight: style.lineHeight,
        fontWeight: style.fontWeight,
        fontStyle: style.fontStyle,
        className: typeof element.className === "string" ? element.className.slice(0, 240) : "",
      }
    }))
  results.push({ ...entry, elements })
  if ((index + 1) % 25 === 0 || index + 1 === entries.length) console.log(`${index + 1}/${entries.length}`)
}

await page.close()
await browser.close()
fs.writeFileSync(path.join(root, ".audit", "font-size-report.json"), `${JSON.stringify(results, null, 2)}\n`)

const all = results.flatMap((pageResult) => pageResult.elements.map((element) => ({ href: pageResult.href, ...element })))
const sizes = new Map()
for (const element of all) sizes.set(element.fontSize, (sizes.get(element.fontSize) || 0) + 1)
const oversized = all
  .filter((element) => element.fontSize >= 30 && element.text.length >= 12)
  .sort((a, b) => b.fontSize - a.fontSize || a.href.localeCompare(b.href))
console.log(JSON.stringify({
  elements: all.length,
  sizes: [...sizes.entries()].sort((a, b) => a[0] - b[0]).map(([fontSize, count]) => ({ fontSize, count })),
  oversizedCount: oversized.length,
  oversized: oversized.slice(0, 160),
}, null, 2))
