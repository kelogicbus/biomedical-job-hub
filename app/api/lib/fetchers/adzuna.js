import { adzunaToJob } from "../job-transformers";

// Targeted entry-level / new grad biomedical queries
const SEARCH_QUERIES = [
  "entry level research assistant",
  "junior research associate biology",
  "lab technician entry level",
  "research technician",
  "clinical research coordinator entry level",
  "laboratory assistant",
  "research intern biomedical",
  "junior scientist pharmaceutical",
];

const LOCATIONS = ["New York", "New Jersey"];

// Titles that indicate senior/irrelevant roles — reject these
const SENIOR_KEYWORDS = [
  "senior", "sr.", "sr ", "principal", "director", "manager",
  "head of", "chief", "vp ", "vice president", "lead",
  "staff scientist", "distinguished", "fellow",
  "professor", "faculty", "tenure", "pi ",
  "executive", "supervisor", "superintendent",
  "10+ years", "8+ years", "7+ years", "6+ years",
];

// Titles/descriptions must contain at least one of these to be relevant
const BIOMEDICAL_TERMS = [
  "research", "lab", "laboratory", "biomedical", "biology",
  "pharma", "biotech", "clinical", "molecular", "cell",
  "neuro", "immuno", "genomic", "science", "chemistry",
  "technician", "scientist", "biologist", "analyst",
  "assay", "pcr", "tissue", "pathology", "oncology",
  "microbiology", "biochem", "genetic", "specimen",
];

/**
 * Returns true if the job appears to be entry-level / new-grad appropriate.
 */
function isEntryLevel(title, description) {
  const t = title.toLowerCase();
  const d = (description || "").toLowerCase();
  const text = `${t} ${d}`;

  // Reject senior roles
  if (SENIOR_KEYWORDS.some((kw) => t.includes(kw))) return false;

  // Must be biomedical-related
  if (!BIOMEDICAL_TERMS.some((term) => text.includes(term))) return false;

  // Salary sanity check — reject if description mentions very high salaries
  // (indicative of senior roles even if title doesn't say "senior")
  const salaryMatch = d.match(/\$(\d{3}),?\d{3}/);
  if (salaryMatch && parseInt(salaryMatch[1]) >= 150) return false;

  return true;
}

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
          sort_by: "date",
          max_days_old: "30",
          what_exclude: "senior director manager principal lead staff VP head",
          salary_max: "85000",
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

        // Post-fetch filter: only keep entry-level biomedical roles
        const filtered = rawJobs.filter((job) => isEntryLevel(job.title, job.description));
        allJobs.push(...filtered);
      } catch (err) {
        console.warn(`Adzuna fetch error (${query}/${location}):`, err.message);
      }
    }
  }

  console.log(`Adzuna: fetched ${allJobs.length} entry-level jobs after filtering`);
  return allJobs;
}
