import { adzunaToJob } from "../job-transformers";

// Targeted entry-level / new grad biomedical queries
const SEARCH_QUERIES = [
  "entry level research assistant",
  "junior research associate biology",
  "lab technician entry level",
  "research technician",
  "laboratory assistant",
  "research intern biomedical",
  "junior scientist pharmaceutical",
  "biotech research associate",
  "quality control analyst pharmaceutical",
  "biomanufacturing technician",
  "biomedical engineer entry level",
  "R&D engineer biotech",
  "medical device engineer entry level",
  "process engineer pharmaceutical",
];

const LOCATIONS = ["New York", "New Jersey", "Massachusetts"];

// Note: Entry-level filtering is handled centrally in cron/route.js
// Adzuna's server-side params (what_exclude, salary_max) do initial filtering

export async function fetchAdzuna() {
  const apiId = process.env.ADZUNA_API_ID;
  const apiKey = process.env.ADZUNA_API_KEY;

  if (!apiId || !apiKey) {
    console.warn("Adzuna: Missing API credentials, skipping");
    return [];
  }

  const allJobs = [];

  for (const query of SEARCH_QUERIES) {
    for (const location of LOCATIONS) {
      try {
        const params = new URLSearchParams({
          app_id: apiId,
          app_key: apiKey,
          what: query,
          where: location,
          results_per_page: "50",
          sort_by: "date",
          max_days_old: "30",
          what_exclude: "senior director manager principal lead staff VP head",
          salary_max: "100000",
        });

        const res = await fetch(
          `https://api.adzuna.com/v1/api/jobs/us/search/1?${params}`,
          { signal: AbortSignal.timeout(8000) }
        );

        if (!res.ok) {
          const errBody = await res.text().catch(() => "");
          console.warn(`Adzuna: ${res.status} for query="${query}" location="${location}" — ${errBody.slice(0, 200)}`);
          continue;
        }

        const data = await res.json();
        const rawJobs = (data.results || []).map((raw) => adzunaToJob(raw));

        // No post-fetch filter here — cron/route.js applies isEntryLevel to ALL jobs
        // Adzuna's server-side params (what_exclude, salary_max) handle initial filtering
        allJobs.push(...rawJobs);
      } catch (err) {
        console.warn(`Adzuna fetch error (${query}/${location}):`, err.message);
      }
    }
  }

  console.log(`Adzuna: fetched ${allJobs.length} entry-level jobs after filtering`);
  return allJobs;
}
