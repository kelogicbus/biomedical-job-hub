"use client";

import { useState } from "react";
import { PIPELINE_COLS } from "@/app/page";

const catColors = {
  "Molecular & Cell Biology": "bg-blue-50 text-blue-700 border-blue-200",
  "Neuroscience": "bg-purple-50 text-purple-700 border-purple-200",
  "Immunology / Immuno-oncology": "bg-red-50 text-red-700 border-red-200",
  "Clinical Trials / CRO": "bg-green-50 text-green-700 border-green-200",
  "Drug Discovery & Pharmacology": "bg-pink-50 text-pink-700 border-pink-200",
  "Tissue Engineering / Regen Med": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Bioinformatics / Computational": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "Quality Control / Regulatory": "bg-amber-50 text-amber-700 border-amber-200",
  "Medical Devices / Biomaterials": "bg-orange-50 text-orange-700 border-orange-200",
  "Public Health / Epidemiology": "bg-teal-50 text-teal-700 border-teal-200",
};

const empColors = { Academic: "bg-violet-100 text-violet-700", Pharma: "bg-blue-100 text-blue-700", "Medical Center": "bg-rose-100 text-rose-700", "Biotech Startup": "bg-emerald-100 text-emerald-700", CRO: "bg-amber-100 text-amber-700", Government: "bg-slate-100 text-slate-700" };

const isNew = (d) => (new Date() - new Date(d)) / 86400000 <= 7;

export function JobCard({ job, tracker, onUpdateTracker, onSave, saved, compact }) {
  const [expanded, setExpanded] = useState(false);
  const [showTracker, setShowTracker] = useState(false);
  const colors = catColors[job.category] || "bg-gray-50 text-gray-700 border-gray-200";
  const eColors = empColors[job.employerType] || "bg-gray-100 text-gray-600";
  const appStatus = tracker?.status || "Not Applied";

  if (compact) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{job.title}</p>
            <p className="text-xs text-gray-600">{job.company}</p>
            <p className="text-xs text-gray-400 mt-0.5">{job.location}</p>
          </div>
          <div className="flex flex-col gap-1 items-end flex-shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full ${eColors}`}>{job.employerType}</span>
            {tracker?.date && <span className="text-xs text-gray-400">{tracker.date}</span>}
          </div>
        </div>
        {tracker?.notes && <p className="text-xs text-gray-500 mt-1 italic">&quot;{tracker.notes}&quot;</p>}
        <div className="flex items-center gap-2 mt-2">
          <select value={appStatus} onChange={(e) => onUpdateTracker(job.id, { ...tracker, status: e.target.value })}
            className="text-xs px-2 py-1 border border-gray-200 rounded bg-white focus:ring-1 focus:ring-blue-400 outline-none flex-1">
            {PIPELINE_COLS.map(s => <option key={s} value={s}>{s}</option>)}
            <option value="Not Applied">Remove</option>
          </select>
          <a href={job.link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Find Job</a>
          {job.searchLinks && (
            <span className="text-xs text-gray-400">
              <a href={job.searchLinks.google} target="_blank" rel="noopener noreferrer" className="hover:text-gray-600">G</a>
              {" · "}
              <a href={job.searchLinks.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-gray-600">Li</a>
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border ${saved ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-200"} shadow-sm hover:shadow-md transition-all duration-200`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colors}`}>{job.category}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${eColors}`}>{job.employerType}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${job.region === "NJ" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{job.region}</span>
              {job.jobType !== "Full-time" && <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-50 text-yellow-700">{job.jobType}</span>}
              {isNew(job.posted) && <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-500 text-white font-bold">NEW</span>}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mt-1">{job.title}</h3>
            <p className="text-sm font-medium text-gray-700 mt-0.5">{job.company}</p>
            {job.lab && <p className="text-xs text-gray-500">{job.lab}</p>}
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <button onClick={() => setShowTracker(!showTracker)}
              className={`p-2 rounded-lg text-xs transition-colors ${appStatus !== "Not Applied" ? "bg-blue-100 text-blue-700" : "bg-gray-50 text-gray-400 hover:bg-gray-100"}`}>
              {appStatus === "Not Applied" ? "○" : "◉"}
            </button>
            <button onClick={() => onSave(job.id)}
              className={`p-2 rounded-lg transition-colors ${saved ? "bg-blue-100 text-blue-600" : "bg-gray-50 text-gray-400 hover:bg-blue-50"}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </button>
          </div>
        </div>

        {showTracker && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Application Tracker</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {["Not Applied", ...PIPELINE_COLS].map(s => (
                <button key={s} onClick={() => onUpdateTracker(job.id, { ...tracker, status: s })}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors border ${appStatus === s ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-100"}`}>
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input type="date" value={tracker?.date || ""} onChange={(e) => onUpdateTracker(job.id, { ...tracker, date: e.target.value })}
                className="text-xs px-2 py-1.5 border border-gray-200 rounded-md bg-white outline-none" />
              <input type="text" placeholder="Notes..." value={tracker?.notes || ""} onChange={(e) => onUpdateTracker(job.id, { ...tracker, notes: e.target.value })}
                className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-md bg-white outline-none" />
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 flex-wrap">
          <span className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {job.location}
          </span>
          <span>{job.jobType}</span>
          <span className="font-medium text-green-700">{job.salary}</span>
          <span className="text-xs text-gray-400">via {job.source}</span>
        </div>

        <p className="text-sm text-gray-600 mt-3 leading-relaxed">{job.description}</p>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Requirements</p>
            <div className="flex flex-wrap gap-1.5">
              {job.requirements.map((r, i) => <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md">{r}</span>)}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <a href={job.link} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Find on Indeed
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
          {job.searchLinks && (
            <span className="text-xs text-gray-400">
              Also try{" "}
              <a href={job.searchLinks.google} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google Jobs</a>
              {" · "}
              <a href={job.searchLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">LinkedIn</a>
            </span>
          )}
          <button onClick={() => setExpanded(!expanded)} className="text-sm text-gray-500 hover:text-gray-700">{expanded ? "Less" : "More info"}</button>
        </div>
      </div>
    </div>
  );
}
