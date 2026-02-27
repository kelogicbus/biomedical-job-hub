import { kvGet, kvSet } from "../lib/kv-helpers";
import { deduplicateJobs, removeExpiredJobs } from "../lib/deduplicator";
import { fetchAdzuna } from "../lib/fetchers/adzuna";
import { fetchRSS } from "../lib/fetchers/rss";
import { generateSearchLinks } from "../lib/link-generator";
import STATIC_JOBS from "@/data/jobs.json";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// ---- Entry-level relevance filter (applied to ALL jobs) ----

const SENIOR_KEYWORDS = [
  "senior", "sr.", "sr ", "principal", "director", "manager",
  "head of", "chief", "vp ", "vice president", "lead",
  "staff scientist", "distinguished", "fellow",
  "professor", "faculty", "tenure", "pi ",
  "executive", "supervisor", "superintendent",
];

const BIOMEDICAL_TERMS = [
  "research", "lab", "laboratory", "biomedical", "biology",
  "pharma", "biotech", "clinical", "molecular", "cell",
  "neuro", "immuno", "genomic", "science", "chemistry",
  "technician", "scientist", "biologist", "analyst",
  "assay", "pcr", "tissue", "pathology", "oncology",
  "microbiology", "biochem", "genetic", "specimen",
];

function isEntryLevel(job) {
  const t = (job.title || "").toLowerCase();
  const d = (job.description || "").toLowerCase();
  const text = `${t} ${d}`;

  // Reject senior roles
  if (SENIOR_KEYWORDS.some((kw) => t.includes(kw))) return false;

  // Must be biomedical-related
  if (!BIOMEDICAL_TERMS.some((term) => text.includes(term))) return false;

  // Reject very high salaries (senior indicator)
  if (job.salaryMin && job.salaryMin > 100000) return false;

  return true;
}

// ---- Cron handler ----

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
  const log = {
    sources: {},
    errors: [],
    totalFetched: 0,
    totalAfterDedup: 0,
    totalActive: 0,
    removedIrrelevant: 0,
    removedExpired: 0,
    carriedForward: 0,
  };

  try {
    // 1. Load existing jobs from Blob (carry forward from previous runs)
    const existingJobs = (await kvGet("jobs:live")) || [];
    log.carriedForward = existingJobs.length;

    // 2. Fetch fresh jobs from Adzuna + RSS in parallel
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

    const allFetched = [...adzunaResult, ...rssResult];
    log.totalFetched = allFetched.length;

    // 3. Prepare static jobs with today's date
    const today = new Date().toISOString().split("T")[0];
    const staticWithDate = STATIC_JOBS.map((j) => ({ ...j, lastSeen: today }));

    // 4. Merge ALL sources: existing Blob jobs + static + freshly fetched
    //    Order matters for dedup — first occurrence wins:
    //    - Fresh fetched first (most up-to-date data)
    //    - Static second (curated baseline)
    //    - Existing last (carried forward, may be stale)
    const { jobs: mergedJobs, fingerprints: allFingerprints } = deduplicateJobs([
      ...allFetched,
      ...staticWithDate,
      ...existingJobs,
    ]);
    log.totalAfterDedup = mergedJobs.length;

    // 5. Apply entry-level relevance filter to ALL jobs (including static + existing)
    const relevantJobs = mergedJobs.filter(isEntryLevel);
    log.removedIrrelevant = mergedJobs.length - relevantJobs.length;

    // 6. Remove expired jobs (>30 days old and not refreshed by any source)
    const activeJobs = removeExpiredJobs(relevantJobs, 30);
    log.removedExpired = relevantJobs.length - activeJobs.length;
    log.totalActive = activeJobs.length;

    // 7. Ensure all jobs have searchLinks (covers static + carried-forward jobs)
    for (const job of activeJobs) {
      if (!job.searchLinks) {
        job.searchLinks = generateSearchLinks(job);
        // Update primary link to Indeed for Adzuna jobs with broken redirects
        if (job.id?.startsWith("adzuna-")) {
          job.link = job.searchLinks.indeed;
        }
      }
    }

    // 8. Store in Blob
    await kvSet("jobs:live", activeJobs);
    await kvSet("jobs:fingerprints", [...allFingerprints]);
    await kvSet("jobs:last-fetch", new Date().toISOString());
    await kvSet("jobs:cron-log", {
      ...log,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    console.log(`Cron complete: ${activeJobs.length} active jobs, removed ${log.removedIrrelevant} irrelevant + ${log.removedExpired} expired (${Date.now() - startTime}ms)`);

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
