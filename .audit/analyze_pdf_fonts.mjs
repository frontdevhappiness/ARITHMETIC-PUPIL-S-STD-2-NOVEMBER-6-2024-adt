import fs from "node:fs"

const xml = fs.readFileSync("/tmp/arithmetic-book.xml", "utf8")
const pages = [...xml.matchAll(/<page\b[\s\S]*?<\/page>/g)].map((match) => match[0])
const counts = new Map()

for (const page of pages) {
  const fonts = new Map(
    [...page.matchAll(/<fontspec id="([^"]+)" size="([0-9.]+)"/g)]
      .map((match) => [match[1], Number(match[2])])
  )
  for (const match of page.matchAll(/<text\b[^>]*font="([^"]+)"[^>]*>/g)) {
    const size = fonts.get(match[1])
    if (size != null) counts.set(size, (counts.get(size) || 0) + 1)
  }
}

console.log(JSON.stringify({
  pages: pages.length,
  sizes: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([size, count]) => ({ size, count })),
}, null, 2))
