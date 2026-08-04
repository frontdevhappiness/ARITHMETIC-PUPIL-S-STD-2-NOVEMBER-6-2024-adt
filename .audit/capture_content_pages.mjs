import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

const { chromium } = await import("/home/echad/Documents/Projects/adt-studio/node_modules/.pnpm/playwright@1.58.2/node_modules/playwright/index.mjs")
const root = "/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt"
const outputDir = path.join(root, ".audit", "rendered-pages")
fs.mkdirSync(outputDir, { recursive: true })
const manifest = JSON.parse(fs.readFileSync(path.join(root, "content/pages.json"), "utf8"))
const requestedSections = process.argv.slice(2).map((value) => value.trim()).filter(Boolean)
const requestedSection = process.env.CAPTURE_SECTION?.trim()
const entries = manifest.filter((entry) =>
  entry.section_id.startsWith("pg") &&
  (
    requestedSections.length === 0
      ? (!requestedSection || entry.section_id === requestedSection)
      : requestedSections.includes(entry.section_id)
  )
)

const browser = await chromium.launch({
  headless: true,
  executablePath: "/snap/bin/chromium",
  args: ["--allow-file-access-from-files", "--disable-dev-shm-usage", "--no-sandbox"],
})

let page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 })
const failures = []
for (let index = 0; index < entries.length; index += 1) {
  if (index > 0 && index % 20 === 0) {
    await page.close().catch(() => {})
    page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 })
  }
  const entry = entries[index]
  try {
    const url = new URL(pathToFileURL(path.join(root, entry.href)).href)
    url.searchParams.set("embed", "1")
    await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 15000 })
    await page.waitForTimeout(500)
    // Reader controls are intentionally outside the book page. Hide them in
    // the source-comparison captures so they cannot obscure tables or inputs.
    await page.addStyleTag({ content: "#interface-container,#nav-container{display:none!important}" })
    const content = page.locator("#content")
    await content.screenshot({
      path: path.join(outputDir, `${entry.section_id}.jpg`),
      type: "jpeg",
      quality: 58,
      timeout: 15000,
    })
  } catch (error) {
    failures.push({ sectionId: entry.section_id, href: entry.href, error: String(error.message || error) })
    await page.close().catch(() => {})
    page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 })
  }
  if ((index + 1) % 20 === 0 || index + 1 === entries.length) {
    console.log(`${index + 1}/${entries.length}`)
  }
}

await page.close().catch(() => {})
await browser.close()
fs.writeFileSync(path.join(root, ".audit", "capture-failures.json"), `${JSON.stringify(failures, null, 2)}\n`)
console.log(JSON.stringify({ pages: entries.length, failures: failures.length }))
