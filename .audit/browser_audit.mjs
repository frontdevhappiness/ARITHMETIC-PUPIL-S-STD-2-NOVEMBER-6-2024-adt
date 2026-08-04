import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

const root = "/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt"
const { chromium } = await import("/home/echad/Documents/Projects/adt-studio/node_modules/.pnpm/playwright@1.58.2/node_modules/playwright/index.mjs")
const manifest = JSON.parse(fs.readFileSync(path.join(root, "content/pages.json"), "utf8"))
const requestedRange = process.env.AUDIT_READER_RANGE?.match(/^(\d+)-(\d+)$/)
const selectedManifest = requestedRange
  ? manifest.slice(Number(requestedRange[1]) - 1, Number(requestedRange[2]))
  : manifest
const hrefs = [...new Set(selectedManifest.map((entry) => entry.href))]
const viewports = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]

const browser = await chromium.launch({
  headless: true,
  executablePath: "/snap/bin/chromium",
  args: ["--allow-file-access-from-files", "--disable-dev-shm-usage", "--no-sandbox"],
})

const results = []
for (const viewport of viewports) {
  let page = await browser.newPage({ viewport })
  for (let index = 0; index < hrefs.length; index += 1) {
    if (index > 0 && index % 25 === 0) {
      await page.close().catch(() => {})
      page = await browser.newPage({ viewport })
    }
    const href = hrefs[index]
    const errors = []
    const onPageError = (error) => errors.push(String(error.stack || error.message || error))
    page.on("pageerror", onPageError)
    try {
      await page.goto(pathToFileURL(path.join(root, href)).href, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      })
      await page.waitForTimeout(350)
      const audit = await page.evaluate(() => {
        const content = document.querySelector("#content")
        const viewportWidth = document.documentElement.clientWidth
        const isVisible = (element) => {
          const style = getComputedStyle(element)
          const rect = element.getBoundingClientRect()
          return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0
        }
        const hasScrollableAncestor = (element) => {
          let parent = element.parentElement
          while (parent && parent !== content) {
            const style = getComputedStyle(parent)
            if (["auto", "scroll"].includes(style.overflowX)) return true
            parent = parent.parentElement
          }
          return false
        }
        const overflowElements = content
          ? [...content.querySelectorAll("*")]
              .filter(isVisible)
              .filter((element) => !element.closest(".sr-only"))
              .filter((element) => !hasScrollableAncestor(element))
              .map((element) => ({ element, rect: element.getBoundingClientRect() }))
              .filter(({ rect }) => rect.left < -2 || rect.right > viewportWidth + 2)
              .slice(0, 12)
              .map(({ element, rect }) => ({
                tag: element.tagName.toLowerCase(),
                id: element.id || null,
                dataId: element.getAttribute("data-id"),
                className: typeof element.className === "string" ? element.className.slice(0, 160) : "",
                left: Math.round(rect.left),
                right: Math.round(rect.right),
                width: Math.round(rect.width),
              }))
          : []
        const brokenImages = [...document.images]
          .filter(isVisible)
          .filter((image) => !image.complete || image.naturalWidth === 0)
          .map((image) => ({ dataId: image.dataset.id || null, src: image.getAttribute("src") }))
        return {
          hasContent: Boolean(content),
          contentOpacity: content ? getComputedStyle(content).opacity : null,
          contentOverflow: content ? content.scrollWidth > content.clientWidth + 2 : false,
          contentScrollWidth: content?.scrollWidth ?? null,
          contentClientWidth: content?.clientWidth ?? null,
          overflowElements,
          brokenImages,
          sassoonLoaded: document.fonts.check('16px "Sassoon Primary"'),
          titleId: document.querySelector('meta[name="title-id"]')?.content ?? null,
        }
      })
      results.push({ href, viewport: viewport.name, ...audit, pageErrors: errors.slice(0, 8) })
    } catch (error) {
      results.push({ href, viewport: viewport.name, fatal: String(error.message || error), pageErrors: errors.slice(0, 8) })
      await page.close().catch(() => {})
      page = await browser.newPage({ viewport })
    } finally {
      page.off("pageerror", onPageError)
    }
    if ((index + 1) % 20 === 0 || index + 1 === hrefs.length) {
      console.log(`${viewport.name}: ${index + 1}/${hrefs.length}`)
    }
  }
  await page.close()
}

await browser.close()
const reportName = requestedRange
  ? `browser-report-${requestedRange[1]}-${requestedRange[2]}.json`
  : "browser-report.json"
fs.writeFileSync(path.join(root, `.audit/${reportName}`), `${JSON.stringify(results, null, 2)}\n`)

const summary = {
  entries: results.length,
  fatal: results.filter((item) => item.fatal).length,
  missingContent: results.filter((item) => !item.fatal && !item.hasContent).length,
  hiddenContent: results.filter((item) => !item.fatal && item.contentOpacity === "0").length,
  contentOverflow: results.filter((item) => item.contentOverflow).length,
  elementOverflow: results.filter((item) => item.overflowElements?.length).length,
  brokenImages: results.filter((item) => item.brokenImages?.length).length,
  sassoonMissing: results.filter((item) => !item.fatal && !item.sassoonLoaded).length,
  pageErrors: results.filter((item) => item.pageErrors?.length).length,
}
console.log(JSON.stringify(summary, null, 2))
