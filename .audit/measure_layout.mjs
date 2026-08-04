import path from "node:path"
import { pathToFileURL } from "node:url"

const { chromium } = await import("/home/echad/Documents/Projects/adt-studio/node_modules/.pnpm/playwright@1.58.2/node_modules/playwright/index.mjs")
const root = "/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt"
const files = process.argv.slice(2)

const browser = await chromium.launch({
  headless: true,
  executablePath: "/snap/bin/chromium",
  args: ["--allow-file-access-from-files", "--disable-dev-shm-usage", "--no-sandbox"],
})

const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 })
for (const file of files) {
  const url = new URL(pathToFileURL(path.join(root, file)).href)
  url.searchParams.set("embed", "1")
  await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 15000 })
  await page.waitForTimeout(500)
  const measurement = await page.evaluate(() => {
    const content = document.querySelector("#content")
    const shell = content?.firstElementChild
    const inner = shell?.firstElementChild
    const tocItems = [...document.querySelectorAll('[data-section-type="table_of_contents"] .space-y-7 > *')]
    const songItems = [...document.querySelectorAll('[data-section-id="pg007_sec001"] .space-y-4 > *')]
    const box = (element) => element ? {
      tag: element.tagName,
      className: element.className,
      rect: Object.fromEntries(["x", "y", "width", "height", "top", "right", "bottom", "left"].map((key) => [key, element.getBoundingClientRect()[key]])),
      fontFamily: getComputedStyle(element).fontFamily,
      fontSize: getComputedStyle(element).fontSize,
      lineHeight: getComputedStyle(element).lineHeight,
      marginTop: getComputedStyle(element).marginTop,
      marginBottom: getComputedStyle(element).marginBottom,
      padding: getComputedStyle(element).padding,
    } : null
    return {
      content: box(content),
      shell: box(shell),
      inner: box(inner),
      tocItems: tocItems.map(box),
      songItems: songItems.map(box),
      scrollHeight: document.documentElement.scrollHeight,
    }
  })
  console.log(JSON.stringify({ file, measurement }))
}

await page.close()
await browser.close()
