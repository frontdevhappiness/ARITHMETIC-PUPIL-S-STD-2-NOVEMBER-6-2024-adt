import path from "node:path"
import { pathToFileURL } from "node:url"

const { chromium } = await import("/home/echad/Documents/Projects/adt-studio/node_modules/.pnpm/playwright@1.58.2/node_modules/playwright/index.mjs")
const root = "/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt"
const browser = await chromium.launch({
  headless: true,
  executablePath: "/snap/bin/chromium",
  args: ["--allow-file-access-from-files", "--disable-dev-shm-usage", "--no-sandbox"],
})
const page = await browser.newPage({ viewport: { width: 1724, height: 1200 } })
await page.goto(pathToFileURL(path.join(root, "pg033_sec001.html")).href, { waitUntil: "domcontentloaded" })
await page.waitForTimeout(800)
const result = await page.evaluate(() => {
  const row = document.querySelector('[data-id="pg033_n0006"]')?.parentElement
  const text = row?.querySelector('[data-id="pg033_n0007"]')
  const blank = row?.querySelector('.fitb-sentence')
  const input = row?.querySelector('input')
  const info = (element) => {
    if (!element) return null
    const rect = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    return {
      html: element.outerHTML,
      text: element.textContent,
      rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
      display: style.display,
      position: style.position,
      gridColumn: style.gridColumn,
      borderBottom: style.borderBottom,
      scrollWidth: element.scrollWidth,
    }
  }
  return { row: info(row), text: info(text), blank: info(blank), input: info(input) }
})
console.log(JSON.stringify(result, null, 2))
await browser.close()
