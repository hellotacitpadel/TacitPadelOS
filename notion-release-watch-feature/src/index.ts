import { Worker } from "@notionhq/workers"
import * as Builder from "@notionhq/workers/builder"
import * as Schema from "@notionhq/workers/schema"
import { fetchFeed } from "./rss.js"

const worker = new Worker()
export default worker

/**
 * Release Watch — polls Notion-update feeds and files new releases into the
 * existing "Notion Updates" database (attached type: deploys migrate its
 * schema but never create/recreate it). A triage skill + human gate layer
 * on top handles the judgement side; this Worker only fetches, parses,
 * dedupes (by Link, the primary key) and upserts. Incremental mode, so
 * history accumulates and old rows are never deleted.
 *
 * IMPORTANT: only the four fetched properties are declared in the schema.
 * Properties declared here become sync-owned (read-only to humans), so the
 * triage fields — Status, Relevance, Tacit impact, Affects, Follow-up task,
 * Reviewed by — must stay NATIVE properties on the database, written by the
 * release-triage skill and the human reviewer, never by this sync.
 */

const FEEDS: { url: string; source: string }[] = [
  {
    // Medium mirror of Matthias Frank's Weekly Notion Roundup.
    // Primary source: MF's own feed (matthiasfrank.de) is Cloudflare-walled
    // and returns 403 from Notion's datacenter. Medium's feed is the same
    // author's content, served from a non-walled host.
    url: "https://medium.com/feed/@mfreihaendig",
    source: "MF Updates RSS",
  },
  {
    // Original feed — kept as fallback. Will 403 from Notion's runtime but
    // works from a local machine, so dry-run tests still validate the parser.
    url: "https://matthiasfrank.de/feed/?post_type=notion-updates",
    source: "MF Updates RSS",
  },
]

const updates = worker.database("updates", {
  type: "attached",
  initialTitle: "Notion Updates",
  primaryKeyProperty: "Link",
  schema: {
    properties: {
      Title: Schema.title(),
      "Release date": Schema.date(),
      Link: Schema.url(),
      Source: Schema.select([
        { name: "MF Updates RSS" },
        { name: "Dev Changelog" },
        { name: "Releases page" },
        { name: "Manual" },
      ]),
    },
  },
})

// Polite pacing for the feed hosts — one request is all a cycle needs.
const feedPacer = worker.pacer("feeds", {
  allowedRequests: 5,
  intervalMs: 10_000,
})

worker.sync("releaseWatch", {
  database: updates,
  mode: "incremental",
  schedule: "6h",
  execute: async () => {
    const changes = []
    for (const feed of FEEDS) {
      await feedPacer.wait()
      let entries
      try {
        entries = await fetchFeed(feed.url)
      } catch (err) {
        // Log and continue — a missed run is picked up next cycle,
        // not retried into a wall.
        console.error(`Feed fetch failed (${feed.url}):`, err)
        continue
      }
      for (const e of entries) {
        changes.push({
          type: "upsert" as const,
          key: e.link, // dedupe: same URL → same row, reruns are no-ops
          properties: {
            Title: Builder.title(e.title),
            Link: Builder.url(e.link),
            Source: Builder.select(feed.source),
            ...(e.pubDate ? { "Release date": Builder.date(e.pubDate) } : {}),
          },
        })
      }
      console.log(`Fetched ${entries.length} entries from ${feed.source}`)
    }
    return { changes, hasMore: false }
  },
})
