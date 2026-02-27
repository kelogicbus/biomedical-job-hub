import { rssToJob } from "../job-transformers";

const RSS_FEEDS = [
  {
    url: "https://feeds.nature.com/naturejobs/rss/sciencejobs",
    name: "nature-jobs",
    format: "atom", // Nature uses Atom format (<entry> tags)
  },
  {
    url: "https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=science",
    name: "science-careers",
    format: "rss", // Standard RSS 2.0 (<item> tags)
  },
];

/**
 * Parse RSS 2.0 feeds (<item> blocks).
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
      description: get("description") || get("summary"),
      pubDate: get("pubDate") || get("dc:date"),
    });
  }

  return items;
}

/**
 * Parse Atom feeds (<entry> blocks).
 * Nature Careers uses Atom format.
 */
function parseAtomEntries(xml) {
  const items = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
      return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() : "";
    };
    // Atom <link> is self-closing: <link href="..." />
    const getLink = () => {
      const m = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
      return m ? m[1] : "";
    };

    items.push({
      title: get("title"),
      link: getLink(),
      description: get("summary") || get("content"),
      pubDate: get("updated") || get("published"),
    });
  }

  return items;
}

/**
 * Filters items to only biomedical/research-related jobs.
 */
function isBiomedicalNYCNJ(item) {
  const text = `${item.title} ${item.description}`.toLowerCase();
  const bioKeywords = ["biomed", "biology", "research", "laboratory", "pharma", "biotech", "clinical", "neuro", "immuno", "molecular", "cell", "genomic", "scientist", "technician", "lab "];

  return bioKeywords.some((k) => text.includes(k));
}

export async function fetchRSS() {
  const allJobs = [];

  for (const feed of RSS_FEEDS) {
    try {
      const res = await fetch(feed.url, {
        signal: AbortSignal.timeout(8000),
        headers: { "Accept": "application/rss+xml, application/xml, application/atom+xml, text/xml" },
      });

      if (!res.ok) {
        console.warn(`RSS: ${res.status} for ${feed.name} (${feed.url})`);
        continue;
      }

      const xml = await res.text();
      console.log(`RSS: ${feed.name} returned ${xml.length} chars`);

      // Parse based on feed format
      const items = feed.format === "atom" ? parseAtomEntries(xml) : parseRSSItems(xml);
      console.log(`RSS: ${feed.name} parsed ${items.length} items`);

      const filtered = items.filter(isBiomedicalNYCNJ);
      console.log(`RSS: ${feed.name} filtered to ${filtered.length} biomedical items`);

      const jobs = filtered.map((item) => rssToJob(item, feed.name));
      allJobs.push(...jobs);
    } catch (err) {
      console.warn(`RSS fetch error (${feed.name}):`, err.message);
    }
  }

  console.log(`RSS: fetched ${allJobs.length} jobs`);
  return allJobs;
}
