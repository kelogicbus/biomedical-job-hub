import { kvGet, kvSet } from "../lib/kv-helpers";
import { deduplicateJobs, removeExpiredJobs } from "../lib/deduplicator";
import { fetchAdzuna } from "../lib/fetchers/adzuna";
import { fetchRSS } from "../lib/fetchers/rss";
import STATIC_JOBS from "@/data/jobs.json";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request) {
  // Verify cron secret — accepts either:
  //   1. Authorization: Bearer <secret> (Vercel cron scheduler sends this)
  //   2. ?secret=<secret> query param (for manual browser testing)
  const authHeader = request.headers.get("authorization");
  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const log = { sources: {}, errors: [], totalFetched: 0, totalAfterDedup: 0, totalActive: 0 };

  try {
    // 1. Fetch from Adzuna + RSS in parallel
    const [adzunaJobs, rssJobs] = await Promise.allSettled([
      fetchAdzuna(),
      fetchRSS(),
    ]);

    const adzunaResult = adzunaJobs.status === "fulfilled" ? adzunaJobs.value : [];
    const rssResult = rssJobs.status === "fulfilled" ? rssJobs.value : [];

    if (adzunaJobs.status === "rejected") log.errors.push(`Adzuna: ${adzunaJobs.reason}`);
    if (rssJobs.status === "rejected") log.errors.push(`RSS: ${rssJobs.reason}`);

    log.sources.adzuna = adzunaResult.length;
    log.sources.rss = rssResult.length;

    // 2. Combine all fetched jobs
    const allFetched = [...adzunaResult, ...rssResult];
    log.totalFetched = allFetched.length;

    // 3. Get existing fingerprints from Blob for dedup against stored jobs
    const existingFingerprints = (await kvGet("jobs:fingerprints")) || [];
    const fpSet = new Set(existingFingerprints);

    // 4. Deduplicate fetched jobs among themselves
    const { jobs: dedupedFetched, fingerprints: newFingerprints } = deduplicateJobs(allFetched);
    log.totalAfterDedup = dedupedFetched.length;

    // 5. Merge with static jobs (static always included as baseline)
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

    // 7. Store in Blob
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
