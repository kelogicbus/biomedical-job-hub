import { kvGet, kvSet } from "../../lib/kv-helpers";
import { deduplicateJobs, removeExpiredJobs } from "../../lib/deduplicator";
import { fetchAdzuna } from "../../lib/fetchers/adzuna";
import { fetchUSAJobs } from "../../lib/fetchers/usajobs";
import { fetchRSS } from "../../lib/fetchers/rss";
import STATIC_JOBS from "@/data/jobs.json";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // Edge-compatible timeout

export async function GET(request) {
  // Verify cron secret (Vercel sends this header for scheduled invocations)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const log = { sources: {}, errors: [], totalFetched: 0, totalAfterDedup: 0, totalActive: 0 };

  try {
    // 1. Fetch from all APIs in parallel
    const [adzunaJobs, usajobsJobs, rssJobs] = await Promise.allSettled([
      fetchAdzuna(),
      fetchUSAJobs(),
      fetchRSS(),
    ]);

    const adzunaResult = adzunaJobs.status === "fulfilled" ? adzunaJobs.value : [];
    const usajobsResult = usajobsJobs.status === "fulfilled" ? usajobsJobs.value : [];
    const rssResult = rssJobs.status === "fulfilled" ? rssJobs.value : [];

    if (adzunaJobs.status === "rejected") log.errors.push(`Adzuna: ${adzunaJobs.reason}`);
    if (usajobsJobs.status === "rejected") log.errors.push(`USAJobs: ${usajobsJobs.reason}`);
    if (rssJobs.status === "rejected") log.errors.push(`RSS: ${rssJobs.reason}`);

    log.sources.adzuna = adzunaResult.length;
    log.sources.usajobs = usajobsResult.length;
    log.sources.rss = rssResult.length;

    // 2. Combine all fetched jobs
    const allFetched = [...adzunaResult, ...usajobsResult, ...rssResult];
    log.totalFetched = allFetched.length;

    // 3. Get existing fingerprints from KV for dedup against stored jobs
    const existingFingerprints = (await kvGet("jobs:fingerprints")) || [];
    const fpSet = new Set(existingFingerprints);

    // 4. Deduplicate fetched jobs among themselves
    const { jobs: dedupedFetched, fingerprints: newFingerprints } = deduplicateJobs(allFetched);
    log.totalAfterDedup = dedupedFetched.length;

    // 5. Merge with static jobs (static always included as baseline)
    // Mark static jobs with lastSeen = today so they don't expire
    const today = new Date().toISOString().split("T")[0];
    const staticWithDate = STATIC_JOBS.map((j) => ({ ...j, lastSeen: today }));

    // Deduplicate static + fetched (static wins on conflict since they have curated data)
    const { jobs: mergedJobs, fingerprints: allFingerprints } = deduplicateJobs([
      ...staticWithDate,
      ...dedupedFetched,
    ]);

    // 6. Remove expired jobs (>30 days old and not refreshed)
    const activeJobs = removeExpiredJobs(mergedJobs, 30);
    log.totalActive = activeJobs.length;

    // 7. Store in KV
    await kvSet("jobs:live", activeJobs);
    await kvSet("jobs:fingerprints", [...allFingerprints]);
    await kvSet("jobs:last-fetch", new Date().toISOString());
    await kvSet("jobs:cron-log", {
      ...log,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    console.log(`Cron complete: ${activeJobs.length} active jobs (${Date.now() - startTime}ms)`);

    return Response.json({
      success: true,
      ...log,
      duration: Date.now() - startTime,
    });
  } catch (err) {
    console.error("Cron fetch failed:", err);
    log.errors.push(err.message);

    // Try to log the failure
    await kvSet("jobs:cron-log", {
      ...log,
      error: err.message,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    return Response.json(
      { success: false, error: err.message, ...log },
      { status: 500 }
    );
  }
}
