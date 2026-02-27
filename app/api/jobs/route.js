import { kvGet } from "../lib/kv-helpers";
import FALLBACK_JOBS from "@/data/jobs.json";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const liveJobs = await kvGet("jobs:live");
    const lastFetch = await kvGet("jobs:last-fetch");

    if (liveJobs && Array.isArray(liveJobs) && liveJobs.length > 0) {
      return Response.json({
        jobs: liveJobs,
        source: "live",
        lastUpdated: lastFetch || null,
        count: liveJobs.length,
      });
    }
  } catch (err) {
    console.error("Failed to read from KV:", err.message);
  }

  // Fallback to static JSON
  return Response.json({
    jobs: FALLBACK_JOBS,
    source: "fallback",
    lastUpdated: null,
    count: FALLBACK_JOBS.length,
  });
}
