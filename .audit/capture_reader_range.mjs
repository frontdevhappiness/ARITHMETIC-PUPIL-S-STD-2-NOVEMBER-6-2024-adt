import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

const { chromium } = await import("/home/echad/Documents/Projects/adt-studio/node_modules/.pnpm/playwright@1.58.2/node_modules/playwright/index.mjs")

const root = "/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt"
const outputDir = path.join(root, ".audit", "reader-130-186")
fs.mkdirSync(outputDir, { recursive: true })

const manifest = JSON.parse(fs.readFileSync(path.join(root, "content", "pages.json"), "utf8"))
const entries = manifest.slice(129, 186)
const browser = await chromium.launch({
  headless: true,
  executablePath: "/snap/bin/chromium",
  args: ["--allow-file-access-from-files", "--disable-dev-shm-usage", "--no-sandbox"],
})

let page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 })
const report = []

for (let offset = 0; offset < entries.length; offset += 1) {
  if (offset > 0 && offset % 16 === 0) {
    await page.close().catch(() => {})
    page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 })
  }

  const readerPage = 130 + offset
  const entry = entries[offset]
  const result = { readerPage, ...entry }
  try {
    const url = new URL(pathToFileURL(path.join(root, entry.href)).href)
    url.searchParams.set("embed", "1")
    await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 15000 })
    await page.waitForTimeout(650)
    await page.addStyleTag({ content: "#interface-container,#nav-container{display:none!important}" })

    result.layout = await page.locator("#content").evaluate((content) => {
      const contentRect = content.getBoundingClientRect()
      const section = content.querySelector("section")
      const sectionRect = section?.getBoundingClientRect()
      const bannerPattern = /^(chapter\s+\w+|example(?:\s+\d+)?|exercise(?:\s+\d+)?|activity|questions?)$/i
      const candidates = Array.from(content.querySelectorAll("h1,h2,h3,h4,p,span,div"))
        .filter((element) => bannerPattern.test((element.textContent || "").trim()))
        .filter((element) => !Array.from(element.children).some((child) => bannerPattern.test((child.textContent || "").trim())))
        .map((element) => {
          const banner = element.closest(".source-book-banner") || element
          const rect = banner.getBoundingClientRect()
          const style = getComputedStyle(banner)
          return {
            text: (element.textContent || "").trim(),
            tag: banner.tagName.toLowerCase(),
            className: banner.className,
            x: Math.round(rect.x - contentRect.x),
            y: Math.round(rect.y - contentRect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            color: style.color,
            backgroundColor: style.backgroundColor,
            borderColor: style.borderColor,
            borderWidth: style.borderWidth,
            borderRadius: style.borderRadius,
          }
        })

      return {
        width: Math.round(contentRect.width),
        height: Math.round(contentRect.height),
        sectionHeight: sectionRect ? Math.round(sectionRect.height) : 0,
        tables: Array.from(content.querySelectorAll("table")).map((table) => {
          const rect = table.getBoundingClientRect()
          return {
            rows: table.rows.length,
            columns: Math.max(0, ...Array.from(table.rows, (row) => row.cells.length)),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            overflow: rect.left < contentRect.left - 1 || rect.right > contentRect.right + 1,
          }
        }),
        images: Array.from(content.querySelectorAll("img")).filter((image) => {
          const rect = image.getBoundingClientRect()
          return rect.width > 0 && rect.height > 0
        }).map((image) => {
          const rect = image.getBoundingClientRect()
          return {
            id: image.dataset.id || "",
            src: image.getAttribute("src") || "",
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            loaded: image.complete && image.naturalWidth > 0,
            overflow: rect.left < contentRect.left - 1 || rect.right > contentRect.right + 1,
          }
        }),
        banners: candidates,
      }
    })

    const filename = `${String(readerPage).padStart(3, "0")}-${entry.section_id}.jpg`
    await page.locator("#content").screenshot({
      path: path.join(outputDir, filename),
      type: "jpeg",
      quality: 82,
      timeout: 20000,
    })
    result.capture = filename
  } catch (error) {
    result.error = String(error.message || error)
  }
  report.push(result)
  if ((offset + 1) % 10 === 0 || offset + 1 === entries.length) {
    console.log(`${offset + 1}/${entries.length}`)
  }
}

await page.close().catch(() => {})
await browser.close()
fs.writeFileSync(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({ entries: report.length, failures: report.filter((item) => item.error).length }))
