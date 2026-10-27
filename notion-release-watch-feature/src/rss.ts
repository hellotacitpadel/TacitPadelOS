/**
 * Minimal RSS/Atom-ish feed reader for the Release Watch worker.
 * No dependencies — parses <item> blocks with regexes. The Matthias Frank
 * updates feed is a standard WordPress RSS 2.0 feed.
 */

export interface FeedEntry {
  title: string
  link: string
  pubDate: string | null // ISO 8601 date (YYYY-MM-DD) or null if unparseable
}

const stripCdata = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim()

const decodeEntities = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")

const field = (item: string, tag: string): string | null => {
  const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))
  return m ? decodeEntities(stripCdata(m[1])) : null
}

const toISODate = (rfc822: string | null): string | null => {
  if (!rfc822) return null
  const d = new Date(rfc822)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

export function parseFeed(xml: string): FeedEntry[] {
  const entries: FeedEntry[] = []
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const item = m[1]
    const title = field(item, "title")
    const link = field(item, "link") ?? field(item, "guid")
    if (!title || !link) continue
    entries.push({ title, link, pubDate: toISODate(field(item, "pubDate")) })
  }
  return entries
}

export async function fetchFeed(url: string): Promise<FeedEntry[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "TacitOS-ReleaseWatch/1.0" },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`Feed returned HTTP ${res.status} for ${url}`)
  return parseFeed(await res.text())
}
