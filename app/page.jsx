"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import FALLBACK_JOBS from "@/data/jobs.json";
import LIVE_FEEDS from "@/data/feeds.json";
import { JobCard } from "@/components/JobCard";
import { SalaryDashboard } from "@/components/SalaryDashboard";
import { PipelineView } from "@/components/PipelineView";
import { LiveFeeds } from "@/components/LiveFeeds";

const CATEGORIES = ["All", "Molecular & Cell Biology", "Neuroscience", "Immunology / Immuno-oncology", "Clinical Trials / CRO", "Drug Discovery & Pharmacology", "Tissue Engineering / Regen Med", "Bioinformatics / Computational", "Quality Control / Regulatory", "Medical Devices / Biomaterials", "Public Health / Epidemiology"];
const REGIONS = ["All", "NYC", "NJ"];
const JOB_TYPES = ["All", "Full-time", "Internship", "Co-op", "Externship", "Contract"];
const EMPLOYER_TYPES = ["All", "Academic", "Pharma", "Medical Center", "Biotech Startup", "CRO", "Government"];
const SOURCES = ["All", "Indeed", "Glassdoor", "LinkedIn", "Direct"];
export const PIPELINE_COLS = ["Interested", "Applied", "Phone Screen", "Interview", "Offer", "Rejected"];

const isNew = (d) => { const diff = (new Date() - new Date(d)) / 86400000; return diff <= 7; };

function usePersistedState(key, initial) {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return initial;
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }, [key, value]);
  return [value, setValue];
}

function FilterChips({ items, value, onChange, label }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-gray-400 font-medium mr-0.5">{label}:</span>
      {items.map(item => (
        <button key={item} onClick={() => onChange(item)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${value === item ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          {item}
        </button>
      ))}
    </div>
  );
}

function timeAgo(isoString) {
  if (!isoString) return null;
  const diff = Date.now() - new Date(isoString).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("jobs");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [region, setRegion] = useState("All");
  const [jobType, setJobType] = useState("All");
  const [employerType, setEmployerType] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [savedJobs, setSavedJobs] = usePersistedState("bjh-saved", []);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [trackers, setTrackers] = usePersistedState("bjh-trackers", {});
  const [sortBy, setSortBy] = useState("newest");

  // Live data state
  const [jobs, setJobs] = useState(FALLBACK_JOBS);
  const [dataSource, setDataSource] = useState("fallback");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch jobs from API on mount
  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await fetch("/api/jobs");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.jobs && data.jobs.length > 0) {
          setJobs(data.jobs);
          setDataSource(data.source || "live");
          setLastUpdated(data.lastUpdated || null);
        }
      } catch (err) {
        console.warn("Failed to fetch live jobs, using fallback:", err.message);
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, []);

  const savedSet = useMemo(() => new Set(savedJobs), [savedJobs]);

  const toggleSave = useCallback((id) => {
    setSavedJobs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, [setSavedJobs]);

  const updateTracker = useCallback((id, data) => {
    setTrackers(prev => ({ ...prev, [id]: { status: "Not Applied", date: "", notes: "", ...data } }));
  }, [setTrackers]);

  const filteredJobs = useMemo(() => {
    let result = jobs.filter(job => {
      const q = search.toLowerCase();
      const ms = !search || job.title.toLowerCase().includes(q) || job.company.toLowerCase().includes(q) || job.description.toLowerCase().includes(q) || job.category.toLowerCase().includes(q) || job.location.toLowerCase().includes(q) || (job.lab || "").toLowerCase().includes(q);
      return ms
        && (category === "All" || job.category === category)
        && (region === "All" || job.region === region)
        && (jobType === "All" || job.jobType === jobType)
        && (employerType === "All" || job.employerType === employerType)
        && (sourceFilter === "All" || job.source === sourceFilter)
        && (!showNewOnly || isNew(job.posted))
        && (!showSavedOnly || savedSet.has(job.id));
    });
    if (sortBy === "newest") result.sort((a, b) => new Date(b.posted) - new Date(a.posted));
    if (sortBy === "salary") result.sort((a, b) => (b.salaryMax || 0) - (a.salaryMax || 0));
    if (sortBy === "company") result.sort((a, b) => a.company.localeCompare(b.company));
    return result;
  }, [jobs, search, category, region, jobType, employerType, sourceFilter, showNewOnly, showSavedOnly, savedSet, sortBy]);

  const trackerStats = useMemo(() => {
    const counts = {};
    PIPELINE_COLS.forEach(c => { counts[c] = 0; });
    Object.values(trackers).forEach(t => { if (t.status && counts[t.status] !== undefined) counts[t.status]++; });
    return counts;
  }, [trackers]);

  const totalTracked = Object.values(trackerStats).reduce((s, v) => s + v, 0);
  const newCount = jobs.filter(j => isNew(j.posted)).length;
  const stats = useMemo(() => ({
    total: jobs.length, nyc: jobs.filter(j => j.region === "NYC").length,
    nj: jobs.filter(j => j.region === "NJ").length,
    companies: new Set(jobs.map(j => j.company)).size,
  }), [jobs]);

  const tabs = [
    { id: "jobs", label: "Jobs Directory", icon: "M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" },
    { id: "salary", label: "Salary Dashboard", icon: "M18 20V10M12 20V4M6 20v-6" },
    { id: "pipeline", label: `Pipeline${totalTracked > 0 ? ` (${totalTracked})` : ""}`, icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-white/10 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Biomedical Research Job Hub</h1>
              <p className="text-blue-200 text-sm">
                NYC + NJ &middot; Academia &middot; Pharma &middot; Biotech &middot; New Grad Positions
                {lastUpdated && (
                  <span className="ml-2 text-blue-300">
                    &middot; Updated {timeAgo(lastUpdated)}
                    {dataSource === "live" && <span className="ml-1 inline-block w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5">
            {[{ v: loading ? "..." : stats.total, l: "Total Listings" }, { v: loading ? "..." : stats.nyc, l: "NYC" }, { v: loading ? "..." : stats.nj, l: "New Jersey" }, { v: loading ? "..." : stats.companies, l: "Institutions" }, { v: loading ? "..." : newCount, l: "New This Week" }].map((s, i) => (
              <div key={i} className="bg-white/10 rounded-lg p-2.5 text-center backdrop-blur-sm">
                <div className="text-xl font-bold">{s.v}</div>
                <div className="text-xs text-blue-200">{s.l}</div>
              </div>
            ))}
          </div>
          {totalTracked > 0 && (
            <div className="flex items-center gap-4 mt-3 bg-white/10 rounded-lg px-4 py-2 backdrop-blur-sm">
              <span className="text-xs text-blue-200 font-medium">PIPELINE:</span>
              {PIPELINE_COLS.filter(c => trackerStats[c] > 0).map(c => (
                <span key={c} className="text-xs"><span className="text-white font-bold">{trackerStats[c]}</span> <span className="text-blue-300">{c}</span></span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={tab.icon}/></svg>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-5">
        {activeTab === "jobs" && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-5">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input type="text" placeholder="Search jobs, companies, labs, locations..." value={search} onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none">
                  <option value="newest">Sort: Newest</option>
                  <option value="salary">Sort: Salary</option>
                  <option value="company">Sort: Company</option>
                </select>
                <button onClick={() => setShowNewOnly(!showNewOnly)} className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${showNewOnly ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>NEW ({newCount})</button>
                <button onClick={() => setShowSavedOnly(!showSavedOnly)} className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${showSavedOnly ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>Saved ({savedJobs.length})</button>
              </div>
              <div className="space-y-2 mt-3">
                <FilterChips items={REGIONS} value={region} onChange={setRegion} label="REGION" />
                <FilterChips items={CATEGORIES} value={category} onChange={setCategory} label="FIELD" />
                <div className="flex flex-wrap gap-4">
                  <FilterChips items={JOB_TYPES} value={jobType} onChange={setJobType} label="TYPE" />
                  <FilterChips items={EMPLOYER_TYPES} value={employerType} onChange={setEmployerType} label="SECTOR" />
                  <FilterChips items={SOURCES} value={sourceFilter} onChange={setSourceFilter} label="SOURCE" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                {loading ? (
                  <span className="text-gray-400">Loading jobs...</span>
                ) : (
                  <><span className="font-semibold text-gray-900">{filteredJobs.length}</span> position{filteredJobs.length !== 1 ? "s" : ""}</>
                )}
              </p>
              {(category !== "All" || region !== "All" || jobType !== "All" || employerType !== "All" || sourceFilter !== "All" || showNewOnly || showSavedOnly || search) && (
                <button onClick={() => { setSearch(""); setCategory("All"); setRegion("All"); setJobType("All"); setEmployerType("All"); setSourceFilter("All"); setShowNewOnly(false); setShowSavedOnly(false); }}
                  className="text-xs text-blue-600 hover:underline">Clear all filters</button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Fetching latest jobs...</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredJobs.length > 0 ? filteredJobs.map(job => (
                  <JobCard key={job.id} job={job} tracker={trackers[job.id]} onUpdateTracker={updateTracker} onSave={toggleSave} saved={savedSet.has(job.id)} />
                )) : (
                  <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                    <p className="text-gray-500">No jobs match your filters.</p>
                  </div>
                )}
              </div>
            )}
            <LiveFeeds feeds={LIVE_FEEDS} region={region} />
          </>
        )}

        {activeTab === "salary" && <SalaryDashboard jobs={jobs} />}
        {activeTab === "pipeline" && <PipelineView trackers={trackers} jobs={jobs} onUpdateTracker={updateTracker} />}

        <div className="mt-8 mb-6 text-center text-xs text-gray-400">
          <p>
            Data from Adzuna, Indeed, Glassdoor, LinkedIn, and institutional career pages.
            {dataSource === "live" && " Auto-refreshes every 6 hours."}
            {dataSource === "fallback" && " Using curated dataset."}
          </p>
        </div>
      </div>
    </div>
  );
}
