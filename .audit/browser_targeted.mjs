import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

const { chromium } = await import("/home/echad/Documents/Projects/adt-studio/node_modules/.pnpm/playwright@1.58.2/node_modules/playwright/index.mjs")
const root = "/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt"
const targets = [
  ["pg002_sec001.html", "desktop"],
  ["pg002_sec001.html", "mobile"],
  ["pg029_sec001.html", "desktop"],
  ["pg029_sec001.html", "mobile"],
  ["pg046_sec001.html", "desktop"],
  ["pg046_sec001.html", "mobile"],
  ["pg097_sec001.html", "desktop"],
  ["pg097_sec001.html", "mobile"],
  ["pg112_sec001.html", "desktop"],
  ["pg112_sec001.html", "mobile"],
  ["pg113_sec001.html", "desktop"],
  ["pg113_sec001.html", "mobile"],
  ["pg141_sec001.html", "desktop"],
  ["pg141_sec001.html", "mobile"],
]
const results = []

for (const [href, viewportName] of targets) {
  const viewport = viewportName === "mobile"
    ? { width: 390, height: 844 }
    : { width: 1280, height: 900 }
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/snap/bin/chromium",
    args: ["--allow-file-access-from-files", "--disable-dev-shm-usage", "--no-sandbox"],
  })
  const page = await browser.newPage({ viewport })
  const errors = []
  const requestFailures = []
  page.on("pageerror", (error) => errors.push(String(error.stack || error.message || error)))
  page.on("requestfailed", (request) => requestFailures.push(`${request.url()} — ${request.failure()?.errorText || "failed"}`))
  let fatal = null
  try {
    await page.goto(pathToFileURL(path.join(root, href)).href, { waitUntil: "domcontentloaded", timeout: 15000 })
    await page.waitForTimeout(1200)
  } catch (error) {
    fatal = String(error.message || error)
  }
  const state = fatal ? null : await page.evaluate(() => {
    const content = document.querySelector("#content")
    return {
      contentOpacity: content ? getComputedStyle(content).opacity : null,
      brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.getAttribute("src")),
      sassoonLoaded: document.fonts.check('16px "Sassoon Primary"'),
    }
  })
  results.push({ href, viewport: viewportName, fatal, errors, requestFailures, state })
  console.log(`${href} ${viewportName}: ${fatal ? "FATAL" : state.contentOpacity === "0" ? "HIDDEN" : "OK"}; errors=${errors.length}`)
  await browser.close().catch(() => {})
}

fs.writeFileSync(path.join(root, ".audit/browser-targeted-report.json"), `${JSON.stringify(results, null, 2)}\n`)
