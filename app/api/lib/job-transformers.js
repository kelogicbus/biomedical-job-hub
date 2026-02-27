/**
 * Transforms raw API responses into the app's 16-field job schema.
 */

import { generateSearchLinks } from "./link-generator";

const BIOMEDICAL_KEYWORDS = {
  "Molecular & Cell Biology": ["molecular", "cell biology", "genomics", "genetics", "pcr", "flow cytometry", "stem cell"],
  "Neuroscience": ["neuro", "brain", "cognitive", "electrophysiology"],
  "Immunology / Immuno-oncology": ["immuno", "immunology", "oncology", "antibody", "t-cell", "car-t"],
  "Clinical Trials / CRO": ["clinical trial", "clinical research", "cra", "cro", "gcp", "regulatory affairs"],
  "Drug Discovery & Pharmacology": ["drug discovery", "pharmacology", "medicinal chemistry", "screening", "assay"],
  "Tissue Engineering / Regen Med": ["tissue engineering", "regenerative", "biomaterial", "scaffold", "3d print"],
  "Bioinformatics / Computational": ["bioinformatics", "computational", "data science", "machine learning", "python", "r programming"],
  "Quality Control / Regulatory": ["quality control", "qc", "qa", "regulatory", "gmp", "validation"],
  "Medical Devices / Biomaterials": ["medical device", "biomaterial", "prosthetic", "implant", "fda 510"],
  "Public Health / Epidemiology": ["public health", "epidemiology", "biostatistics", "population health"],
};

function guessCategory(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  for (const [cat, keywords] of Object.entries(BIOMEDICAL_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) return cat;
  }
  return "Molecular & Cell Biology"; // default
}

function guessEmployerType(company) {
  const c = company.toLowerCase();
  const pharma = ["pfizer", "merck", "bms", "bristol-myers", "novartis", "amgen", "regeneron", "j&j", "johnson", "abbvie", "roche", "sanofi", "lilly", "astrazeneca", "gsk", "kenvue"];
  const academic = ["university", "college", "institute", "school of", "rockefeller", "columbia", "nyu", "cornell", "princeton", "rutgers", "yale", "harvard", "mit"];
  const medical = ["hospital", "medical center", "mount sinai", "langone", "memorial sloan", "health system"];
  const cro = ["iqvia", "covance", "labcorp", "pra health", "parexel", "syneos", "icon"];
  const gov = ["nih", "fda", "cdc", "department of", "national institute", "va ", "veterans"];

  if (pharma.some((p) => c.includes(p))) return "Pharma";
  if (academic.some((a) => c.includes(a))) return "Academic";
  if (medical.some((m) => c.includes(m))) return "Medical Center";
  if (cro.some((r) => c.includes(r))) return "CRO";
  if (gov.some((g) => c.includes(g))) return "Government";
  return "Biotech Startup";
}

function guessRegion(location) {
  const loc = (location || "").toLowerCase();
  if (loc.includes("nj") || loc.includes("new jersey") || loc.includes("princeton") || loc.includes("new brunswick") || loc.includes("rahway") || loc.includes("kenilworth") || loc.includes("tarrytown")) return "NJ";
  return "NYC";
}

function guessJobType(title) {
  const t = title.toLowerCase();
  if (t.includes("intern")) return "Internship";
  if (t.includes("co-op") || t.includes("coop")) return "Co-op";
  if (t.includes("extern")) return "Externship";
  if (t.includes("contract") || t.includes("temp")) return "Contract";
  return "Full-time";
}

function formatSalary(min, max) {
  if (!min && !max) return "Salary not listed";
  const fmt = (n) => `$${Math.round(n / 1000)}k`;
  if (min && max) return `${fmt(min)}–${fmt(max)}/yr`;
  if (min) return `From ${fmt(min)}/yr`;
  return `Up to ${fmt(max)}/yr`;
}

// --- Adzuna ---

export function adzunaToJob(raw) {
  const salMin = raw.salary_min ? Math.round(raw.salary_min) : null;
  const salMax = raw.salary_max ? Math.round(raw.salary_max) : null;
  const location = raw.location?.display_name || "";
  const title = raw.title?.replace(/<[^>]*>/g, "") || ""; // strip HTML tags

  const job = {
    id: `adzuna-${raw.id}`,
    title,
    company: raw.company?.display_name || "Unknown",
    lab: null,
    location: location.split(",").slice(0, 2).join(",").trim() || location,
    region: guessRegion(location),
    jobType: guessJobType(title),
    category: guessCategory(title, raw.description || ""),
    employerType: guessEmployerType(raw.company?.display_name || ""),
    salary: formatSalary(salMin, salMax),
    salaryMin: salMin,
    salaryMax: salMax,
    description: (raw.description || "").replace(/<[^>]*>/g, "").slice(0, 500),
    requirements: [],
    posted: raw.created ? raw.created.split("T")[0] : new Date().toISOString().split("T")[0],
    link: "", // will be set below
    source: "Indeed",
    lastSeen: new Date().toISOString().split("T")[0],
  };

  // Generate direct search URLs instead of broken Adzuna redirects
  const links = generateSearchLinks(job);
  job.link = links.indeed;
  job.searchLinks = links;

  return job;
}

// --- USAJobs ---

export function usajobsToJob(raw) {
  const positionDesc = raw.MatchedObjectDescriptor || raw;
  const salary = positionDesc.PositionRemuneration?.[0];
  const salMin = salary ? Math.round(Number(salary.MinimumRange)) : null;
  const salMax = salary ? Math.round(Number(salary.MaximumRange)) : null;
  const locations = positionDesc.PositionLocation || [];
  const loc = locations[0]?.LocationName || "";

  return {
    id: `usajobs-${positionDesc.PositionID}`,
    title: positionDesc.PositionTitle || "",
    company: positionDesc.OrganizationName || positionDesc.DepartmentName || "Federal Agency",
    lab: null,
    location: loc,
    region: guessRegion(loc),
    jobType: "Full-time",
    category: guessCategory(positionDesc.PositionTitle || "", positionDesc.QualificationSummary || ""),
    employerType: "Government",
    salary: formatSalary(salMin, salMax),
    salaryMin: salMin,
    salaryMax: salMax,
    description: (positionDesc.QualificationSummary || positionDesc.UserArea?.Details?.MajorDuties || "").slice(0, 500),
    requirements: [],
    posted: positionDesc.PublicationStartDate || new Date().toISOString().split("T")[0],
    link: positionDesc.PositionURI || positionDesc.ApplyURI?.[0] || "",
    source: "Direct",
    lastSeen: new Date().toISOString().split("T")[0],
  };
}

// --- RSS Feeds ---

export function rssToJob(item, feedSource) {
  const title = item.title?.[0] || item.title || "";
  const link = item.link?.[0] || item.link || "";
  const desc = item.description?.[0] || item.description || "";
  const pubDate = item.pubDate?.[0] || item.pubDate || "";
  const cleanDesc = desc.replace(/<[^>]*>/g, "").slice(0, 500);

  // Try to extract company from title (often "Title - Company" or "Title at Company")
  let company = "Unknown";
  if (title.includes(" - ")) company = title.split(" - ").pop().trim();
  else if (title.includes(" at ")) company = title.split(" at ").pop().trim();

  const job = {
    id: `rss-${feedSource}-${simpleHash(title + link)}`,
    title: title.split(" - ")[0].split(" at ")[0].trim(),
    company,
    lab: null,
    location: "New York, NY",
    region: "NYC",
    jobType: guessJobType(title),
    category: guessCategory(title, cleanDesc),
    employerType: guessEmployerType(company),
    salary: "Salary not listed",
    salaryMin: null,
    salaryMax: null,
    description: cleanDesc,
    requirements: [],
    posted: pubDate ? new Date(pubDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    link: link || "",
    source: "Direct",
    lastSeen: new Date().toISOString().split("T")[0],
  };

  // Add search links as fallbacks (RSS links may be direct to poster)
  job.searchLinks = generateSearchLinks(job);

  return job;
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash).toString(36);
}
