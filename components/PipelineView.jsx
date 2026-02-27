"use client";

import { useMemo } from "react";
import { JobCard } from "./JobCard";
import { PIPELINE_COLS } from "@/app/page";

const pipeColors = { Interested: "#6366f1", Applied: "#3b82f6", "Phone Screen": "#f59e0b", Interview: "#8b5cf6", Offer: "#10b981", Rejected: "#ef4444" };

export function PipelineView({ trackers, jobs, onUpdateTracker }) {
  const columns = useMemo(() => {
    const cols = {};
    PIPELINE_COLS.forEach(c => { cols[c] = []; });
    Object.entries(trackers).forEach(([id, t]) => {
      if (t.status && t.status !== "Not Applied" && cols[t.status]) {
        const job = jobs.find(j => j.id === Number(id));
        if (job) cols[t.status].push({ job, tracker: t });
      }
    });
    return cols;
  }, [trackers, jobs]);

  const totalTracked = Object.values(columns).reduce((s, c) => s + c.length, 0);
  const applied = columns["Applied"].length + columns["Phone Screen"].length + columns["Interview"].length + columns["Offer"].length;
  const interviewed = columns["Interview"].length + columns["Offer"].length;
  const offers = columns["Offer"].length;
  const funnelData = PIPELINE_COLS.filter(c => c !== "Rejected").map(c => ({ name: c, count: columns[c].length }));
  const maxFunnel = Math.max(...funnelData.map(d => d.count), 1);

  const exportCSV = () => {
    const rows = [["Title", "Company", "Location", "Status", "Date", "Notes", "Link"]];
    Object.entries(trackers).forEach(([id, t]) => {
      if (t.status && t.status !== "Not Applied") {
        const job = jobs.find(j => j.id === Number(id));
        if (job) rows.push([job.title, job.company, job.location, t.status, t.date || "", t.notes || "", job.link]);
      }
    });
    const csv = rows.map(r => r.map(c => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "job-applications.csv";
    a.click();
  };

  if (totalTracked === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
        <div className="text-4xl mb-3">📋</div>
        <h3 className="text-lg font-semibold text-gray-900">No applications tracked yet</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">Go to the Jobs Directory tab, find positions you like, and click the tracker icon to start building your pipeline.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Application Funnel</h3>
          <button onClick={exportCSV} className="text-xs text-blue-600 hover:underline">Export CSV</button>
        </div>
        <div className="space-y-2">
          {funnelData.map((d) => (
            <div key={d.name} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-28 text-right">{d.name}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                <div className="h-full rounded-full flex items-center px-2 text-xs text-white font-medium transition-all duration-500"
                  style={{ width: `${Math.max((d.count / maxFunnel) * 100, d.count > 0 ? 12 : 0)}%`, backgroundColor: pipeColors[d.name] }}>
                  {d.count > 0 && d.count}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-6 mt-4 pt-3 border-t border-gray-100">
          <div className="text-center"><p className="text-lg font-bold text-gray-900">{totalTracked}</p><p className="text-xs text-gray-500">Total</p></div>
          {applied > 0 && <div className="text-center"><p className="text-lg font-bold text-blue-600">{interviewed > 0 ? `${Math.round((interviewed / applied) * 100)}%` : "—"}</p><p className="text-xs text-gray-500">Interview Rate</p></div>}
          {interviewed > 0 && <div className="text-center"><p className="text-lg font-bold text-green-600">{offers > 0 ? `${Math.round((offers / interviewed) * 100)}%` : "—"}</p><p className="text-xs text-gray-500">Offer Rate</p></div>}
          <div className="text-center"><p className="text-lg font-bold text-red-500">{columns["Rejected"].length}</p><p className="text-xs text-gray-500">Rejected</p></div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {PIPELINE_COLS.map(col => (
          <div key={col} className="bg-gray-50 rounded-xl border border-gray-200 p-3 min-h-[200px]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{col}</h4>
              <span className="text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center" style={{ backgroundColor: pipeColors[col] + "22", color: pipeColors[col] }}>{columns[col].length}</span>
            </div>
            <div className="space-y-2">
              {columns[col].map(({ job, tracker }) => (
                <JobCard key={job.id} job={job} tracker={tracker} onUpdateTracker={onUpdateTracker} saved={false} compact />
              ))}
              {columns[col].length === 0 && <p className="text-xs text-gray-400 text-center py-4">Empty</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
