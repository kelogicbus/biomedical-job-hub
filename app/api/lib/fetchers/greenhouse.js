import { greenhouseToJob } from "../job-transformers";

/**
 * Greenhouse Job Board API — free, public, no auth required.
 * Fetches open positions directly from company career pages.
 *
 * To add a new company, just append to GREENHOUSE_BOARDS.
 * Find board tokens at: https://boards-api.greenhouse.io/v1/boards/{token}/jobs
 */

const GREENHOUSE_BOARDS = [
  { token: "modernatx", company: "Moderna", region: "MA" },
  { token: "blueprintmedicines", company: "Blueprint Medicines", region: "MA" },
];

export async function fetchGreenhouse() {
  const allJobs = [];

  for (const board of GREENHOUSE_BOARDS) {
    try {
      const url = `https://boards-api.greenhouse.io/v1/boards/${board.token}/jobs?content=true`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

      if (!res.ok) {
        console.warn(`Greenhouse: ${res.status} for ${board.company} (${board.token})`);
        continue;
      }

      const data = await res.json();
      const jobs = (data.jobs || []).map((raw) =>
        greenhouseToJob(raw, board.company, board.token)
      );

      allJobs.push(...jobs);
      console.log(`Greenhouse: ${jobs.length} jobs from ${board.company}`);
    } catch (err) {
      console.warn(`Greenhouse fetch error (${board.company}):`, err.message);
    }
  }

  console.log(`Greenhouse: fetched ${allJobs.length} total jobs`);
  return allJobs;
}
