import { adzunaToJob } from "../job-transformers";

const SEARCH_QUERIES = [
  "biomedical research",
  "research associate biology",
  "lab technician pharmaceutical",
  "clinical research associate",
];

const LOCATIONS = ["New York", "New Jersey"];

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
          results_per_page: "20",
          content_type: "application/json",
          sort_by: "date",
        });

        const res = await fetch(
          `https://api.adzuna.com/v1/api/jobs/us/search/1?${params}`,
          { signal: AbortSignal.timeout(8000) }
        );

        if (!res.ok) {
          console.warn(`Adzuna: ${res.status} for query="${query}" location="${location}"`);
          continue;
        }

        const data = await res.json();
        const jobs = (data.results || []).map((raw) => adzunaToJob(raw));
        allJobs.push(...jobs);
      } catch (err) {
        console.warn(`Adzuna fetch error (${query}/${location}):`, err.message);
      }
    }
  }

  console.log(`Adzuna: fetched ${allJobs.length} jobs`);
  return allJobs;
}
