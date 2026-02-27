/**
 * Generates direct search URLs on Indeed, Google Jobs, and LinkedIn
 * from job metadata (title, company, location).
 *
 * Replaces broken Adzuna redirect URLs with links that actually work.
 */

function sanitize(str) {
  return (str || "")
    .replace(/<[^>]*>/g, "") // strip HTML
    .replace(/\s+/g, " ")    // collapse whitespace
    .trim();
}

export function generateSearchLinks(job) {
  const title = sanitize(job.title);
  const company = sanitize(job.company);
  const location = sanitize(job.location);

  const query = `${title} ${company}`.trim();

  return {
    indeed: `https://www.indeed.com/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}`,
    google: `https://www.google.com/search?q=${encodeURIComponent(`${query} ${location} jobs`)}`,
    linkedin: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`,
  };
}
