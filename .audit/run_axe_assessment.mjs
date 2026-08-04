import fs from "node:fs"
import { runAccessibilityAssessment } from "/home/echad/Documents/Projects/adt-studio/packages/pipeline/dist/accessibility-assessment.js"

const root = "/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt"
const result = await runAccessibilityAssessment({ bookDir: `${root}/.audit/book-wrapper` })
fs.writeFileSync(`${root}/.audit/axe-report.json`, `${JSON.stringify(result, null, 2)}\n`)

const rules = new Map()
for (const page of result.pages) {
  for (const finding of page.violations) {
    const current = rules.get(finding.id) ?? { pages: 0, nodes: 0, impact: finding.impact }
    current.pages += 1
    current.nodes += finding.nodes.length
    rules.set(finding.id, current)
  }
}
console.log(JSON.stringify({ summary: result.summary, rules: Object.fromEntries(rules) }, null, 2))
