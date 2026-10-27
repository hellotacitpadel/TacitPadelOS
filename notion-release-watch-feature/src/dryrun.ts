/**
 * Local dry-run: fetches the real feed and prints what the sync would
 * upsert — without touching Notion. Run: npx tsx src/dryrun.ts
 */
import { fetchFeed } from "./rss.js"

const entries = await fetchFeed(
  "https://matthiasfrank.de/feed/?post_type=notion-updates"
)
console.log(`entries: ${entries.length}`)
for (const e of entries.slice(0, 8)) {
  console.log(`- ${e.pubDate ?? "(no date)"} | ${e.title.slice(0, 90)}`)
  console.log(`    ${e.link}`)
}
