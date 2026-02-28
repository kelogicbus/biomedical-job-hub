"use client";

import { useState } from "react";

export function LiveFeeds({ feeds, region }) {
  const [open, setOpen] = useState(false);
  const filtered = feeds.filter(f => region === "All" || f.region === region);
  const platforms = [...new Set(filtered.map(f => f.platform))];

  return (
    <div className="mt-6">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 text-sm">Live Job Board Feeds ({filtered.length})</p>
            <p className="text-xs text-gray-500">Grouped by platform — click for latest real-time postings</p>
          </div>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {open && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mt-2 divide-y divide-gray-100">
          {platforms.map(platform => {
            const pFeeds = filtered.filter(f => f.platform === platform);
            return (
              <div key={platform}>
                <div className="px-4 py-2 bg-gray-50"><span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{platform} ({pFeeds.length})</span></div>
                {pFeeds.map((feed, i) => (
                  <a key={i} href={feed.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-sm text-gray-700 group-hover:text-blue-700">{feed.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${feed.region === "NJ" ? "bg-emerald-50 text-emerald-600" : feed.region === "MA" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"}`}>{feed.region}</span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 group-hover:text-blue-500"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </a>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
