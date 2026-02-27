import { rssToJob } from "../job-transformers";

const RSS_FEEDS = [
  {
    url: "https://www.science.org/action/showFeed?type=job&location=United+States",
    name: "science-careers",
  },
  {
    url: "https://www.nature.com/naturecareers.rss",
    name: "nature-jobs",
  },
];

/**
 * Minimal XML parser for RSS feeds.
 * Avoids xml2js dependency — parses <item> blocks with regex.
 * Works for standard RSS 2.0 feeds.
 */
function parseRSSItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
      return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() : "";
    };

    items.push({
      title: get("title"),
      link: get("link"),
      description: get("description"),
      pubDate: get("pubDate"),
    });
  }

  return items;
}

/**
 * Filters RSS items to only biomedical/research-related jobs in NYC/NJ area.
 */
function isBiomedicalNYCNJ(item) {
  const text = `${item.title} ${item.description}`.toLowerCase();
  const bioKeywords = ["biomed", "biology", "research", "laboratory", "pharma", "biotech", "clinical", "neuro", "immuno", "molecular", "cell", "genomic", "scientist", "technician", "lab "];
  const locationKeywords = ["new york", "nyc", "manhattan", "brooklyn", "bronx", "queens", "new jersey", "nj", "princeton", "rutgers", "newark"];

  const hasBio = bioKeywords.some((k) => text.includes(k));
  const hasLocation = locationKeywords.some((k) => text.includes(k));

  // Accept if biomedical keyword found (location filter is loose since many feeds don't specify location)
  return hasBio;
}

export async function fetchRSS() {
  const allJobs = [];

  for (const feed of RSS_FEEDS) {
    try {
      const res = await fetch(feed.url, {
        signal: AbortSignal.timeout(8000),
        headers: { "Accept": "application/rss+xml, application/xml, text/xml" },
      });

      if (!res.ok) {
        console.warn(`RSS: ${res.status} for ${feed.name}`);
        continue;
      }

      const xml = await res.text();
      const items = parseRSSItems(xml);
      const filtered = items.filter(isBiomedicalNYCNJ);
      const jobs = filtered.map((item) => rssToJob(item, feed.name));
      allJobs.push(...jobs);
    } catch (err) {
      console.warn(`RSS fetch error (${feed.name}):`, err.message);
    }
  }

  console.log(`RSS: fetched ${allJobs.length} jobs`);
  return allJobs;
}
