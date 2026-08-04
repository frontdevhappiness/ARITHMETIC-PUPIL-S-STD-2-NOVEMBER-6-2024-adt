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
const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 })
const results = []

for (const [index, entry] of entries.entries()) {
  const url = new URL(pathToFileURL(path.join(root, entry.href)).href)
  url.searchParams.set("embed", "1")
  await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 15000 })
  await page.waitForTimeout(250)
  const metric = await page.evaluate(() => {
    const shell = document.querySelector("#content > [data-book-page]")
    if (!shell) return null
    const shellRect = shell.getBoundingClientRect()
    const descendants = [...shell.querySelectorAll("*")]
      .filter((element) => {
        const style = getComputedStyle(element)
        if (style.display === "none" || style.visibility === "hidden") return false
        const rect = element.getBoundingClientRect()
        return rect.height > 0 && rect.bottom > shellRect.bottom + 1
      })
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id,
          dataId: element.getAttribute("data-id"),
          text: (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 90),
          bottom: Math.round(rect.bottom - shellRect.top),
        }
      })
    return {
      clientHeight: shell.clientHeight,
      scrollHeight: shell.scrollHeight,
      overflow: shell.scrollHeight - shell.clientHeight,
      overflowElements: descendants.slice(-8),
    }
  })
  results.push({ ...entry, ...metric })
  if ((index + 1) % 25 === 0 || index + 1 === entries.length) console.log(`${index + 1}/${entries.length}`)
}

await page.close()
await browser.close()

const reportPath = path.join(root, ".audit/vertical-overflow-report.json")
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2) + "\n")
const overflow = results.filter((entry) => entry.overflow > 1).sort((a, b) => b.overflow - a.overflow)
console.log(JSON.stringify({ pages: results.length, overflowing: overflow.length, worst: overflow.slice(0, 30).map(({ href, page_number, overflow, overflowElements }) => ({ href, page_number, overflow, overflowElements })) }, null, 2))
