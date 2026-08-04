import fs from "node:fs"
import path from "node:path"

const root = "/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt"
const manifest = JSON.parse(fs.readFileSync(path.join(root, "content/pages.json"), "utf8"))
let updated = 0
for (const entry of manifest) {
  if (!entry.section_id.startsWith("pg")) continue
  const filePath = path.join(root, entry.href)
  let html = fs.readFileSync(filePath, "utf8")
  html = html.replace(/<style\b[^>]*>/gi, (tag) =>
    tag.replace(/\s(?:tabindex|data-print-page|data-book-page)="[^"]*"/g, "")
  )
  const contentMatch = /<div\b[^>]*\bid="content"[^>]*>/i.exec(html)
  if (!contentMatch) throw new Error(`Missing #content in ${entry.href}`)
  const contentEnd = contentMatch.index + contentMatch[0].length
  const remainder = html.slice(contentEnd)
  const firstElement = /^(?:\s|<!--[\s\S]*?-->|<style\b[\s\S]*?<\/style>|<script\b[\s\S]*?<\/script>)*<([a-zA-Z][\w:-]*)\b/i.exec(remainder)
  if (!firstElement) throw new Error(`Missing page wrapper in ${entry.href}`)
  const tagOffset = contentEnd + firstElement.index + firstElement[0].lastIndexOf(`<${firstElement[1]}`)
  const tagEnd = html.indexOf(">", tagOffset)
  const startTag = html.slice(tagOffset, tagEnd + 1)
  let replacement = startTag.replace(/\sdata-print-page="[^"]*"/, "")
  replacement = replacement.replace(/\stabindex="[^"]*"/, "")
  if (/\sdata-book-page="[^"]*"/.test(replacement)) {
    replacement = replacement.replace(/data-book-page="[^"]*"/, 'data-book-page="true"')
  } else {
    replacement = replacement.replace(/^<([a-zA-Z][\w:-]*)/, '<$1 data-book-page="true"')
  }
  /* Div wrappers receive an accessible region name. Section wrappers already
   * have native section semantics and an accessible name. */
  if (firstElement[1].toLowerCase() === "div") {
    if (!/\srole="[^"]*"/.test(replacement)) {
      replacement = replacement.replace(/^<div/, '<div role="region"')
    }
    if (!/\saria-(?:label|labelledby)="[^"]*"/.test(replacement)) {
      replacement = replacement.replace(/^<div/, '<div aria-label="Book page"')
    }
  }
  if (replacement !== startTag) {
    html = html.slice(0, tagOffset) + replacement + html.slice(tagEnd + 1)
    fs.writeFileSync(filePath, html)
    updated += 1
  }
}

console.log(JSON.stringify({ updated }))
