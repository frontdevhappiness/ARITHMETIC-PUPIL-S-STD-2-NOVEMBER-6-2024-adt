import path from "node:path"
import { pathToFileURL } from "node:url"

const { chromium } = await import("/home/echad/Documents/Projects/adt-studio/node_modules/.pnpm/playwright@1.58.2/node_modules/playwright/index.mjs")
const root = "/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt"
const browser = await chromium.launch({
  headless: true,
  executablePath: "/snap/bin/chromium",
  args: ["--allow-file-access-from-files", "--disable-dev-shm-usage", "--no-sandbox"],
})
const page = await browser.newPage({ viewport: { width: 1100, height: 1300 } })
await page.goto(pathToFileURL(path.join(root, "pg065_sec001.html")).href, { waitUntil: "domcontentloaded" })
await page.waitForTimeout(900)

const result = await page.evaluate(() => {
  const rows = [...document.querySelectorAll(".exercise-line")]
  return {
    rows: rows.length,
    inputs: rows.filter((row) => row.querySelector("input")).length,
    numbers: rows.map((row) => {
      const number = row.querySelector(":scope > .source-question-number")
      return {
        text: number?.textContent || null,
        color: number ? getComputedStyle(number).color : null,
      }
    }),
    splitNumbers: rows.filter((row) => !row.querySelector(":scope > .source-question-number")).length,
    samples: rows.slice(0, 2).map((row) => row.outerHTML),
    layout: (() => {
      const section = document.querySelector('[data-section-id="pg065_sec001"]')
      if (!section) return null
      const rect = section.getBoundingClientRect()
      const children = [...section.children]
      const contentBottom = Math.max(...children.map((child) => child.getBoundingClientRect().bottom))
      return {
        sectionHeight: rect.height,
        scrollHeight: section.scrollHeight,
        contentBottomInsideSection: Math.round((contentBottom - rect.top) * 10) / 10,
        clipped: section.scrollHeight > section.clientHeight + 1 || contentBottom > rect.bottom + 1,
      }
    })(),
  }
})
await page.screenshot({ path: path.join(root, ".audit", "pg065-number-fix.png"), fullPage: true })
console.log(JSON.stringify(result, null, 2))
await page.goto(pathToFileURL(path.join(root, "pg064_sec001.html")).href, { waitUntil: "domcontentloaded" })
await page.waitForTimeout(900)
await page.screenshot({ path: path.join(root, ".audit", "pg064-boundary-fix.png"), fullPage: true })
await browser.close()
