/**
 * Deduplicates jobs by creating a fingerprint from title + company + location.
 * Uses a simple string hash (no crypto dependency needed).
 */

function fingerprint(job) {
  const raw = `${(job.title || "").toLowerCase().trim()}|${(job.company || "").toLowerCase().trim()}|${(job.location || "").toLowerCase().trim()}`;
  // Simple djb2 hash — fast, no external deps
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash + raw.charCodeAt(i)) & 0xffffffff;
  }
  return hash.toString(36);
}

/**
 * Deduplicates an array of jobs. First occurrence wins.
 * Also accepts an existing fingerprint set to avoid duplicating against stored jobs.
 */
export function deduplicateJobs(jobs, existingFingerprints = new Set()) {
  const seen = new Set(existingFingerprints);
  const unique = [];

  for (const job of jobs) {
    const fp = fingerprint(job);
    if (!seen.has(fp)) {
      seen.add(fp);
      unique.push(job);
    }
  }

  return { jobs: unique, fingerprints: seen };
}

/**
 * Removes jobs older than maxDays that haven't been refreshed.
 * Jobs with a `lastSeen` date are kept if recently seen; jobs without it use `posted`.
 */
export function removeExpiredJobs(jobs, maxDays = 30) {
  const now = Date.now();
  const cutoff = maxDays * 86400000;

  return jobs.filter((job) => {
    const refDate = job.lastSeen || job.posted;
    if (!refDate) return true; // keep jobs with no date info
    const age = now - new Date(refDate).getTime();
    return age <= cutoff;
  });
}
