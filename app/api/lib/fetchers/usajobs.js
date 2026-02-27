import { usajobsToJob } from "../job-transformers";

const KEYWORDS = [
  "biomedical research",
  "biological science",
  "research biologist",
  "microbiologist",
  "pharmacologist",
];

export async function fetchUSAJobs() {
  const apiKey = process.env.USAJOBS_API_KEY;

  if (!apiKey) {
    console.warn("USAJobs: Missing API key, skipping");
    return [];
  }

  const allJobs = [];

  for (const keyword of KEYWORDS) {
    try {
      const params = new URLSearchParams({
        Keyword: keyword,
        LocationName: "New York;New Jersey",
        ResultsPerPage: "25",
      });

      const res = await fetch(
        `https://data.usajobs.gov/api/search?${params}`,
        {
          headers: {
            "Authorization-Key": apiKey,
            "User-Agent": "biomedical-job-hub/1.0 (contact: biomedical-job-hub@users.noreply.github.com)",
          },
          signal: AbortSignal.timeout(8000),
        }
      );

      if (!res.ok) {
        console.warn(`USAJobs: ${res.status} for keyword="${keyword}"`);
        continue;
      }

      const data = await res.json();
      const items = data.SearchResult?.SearchResultItems || [];
      const jobs = items.map((item) => usajobsToJob(item.MatchedObjectDescriptor));
      allJobs.push(...jobs);
    } catch (err) {
      console.warn(`USAJobs fetch error (${keyword}):`, err.message);
    }
  }

  console.log(`USAJobs: fetched ${allJobs.length} jobs`);
  return allJobs;
}
