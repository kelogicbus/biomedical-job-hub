"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const barColors = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-xs">
      <p className="font-semibold text-gray-900">{d.name}</p>
      <p className="text-gray-600">Avg: ${(d.avg / 1000).toFixed(0)}k &middot; Range: ${(d.min / 1000).toFixed(0)}k&ndash;${(d.max / 1000).toFixed(0)}k</p>
      <p className="text-gray-400">{d.count} positions</p>
    </div>
  );
}

export function SalaryDashboard({ jobs }) {
  const byEmployer = useMemo(() => {
    const g = {};
    jobs.forEach(j => { if (!j.salaryMin) return; if (!g[j.employerType]) g[j.employerType] = { type: j.employerType, s: [] }; g[j.employerType].s.push((j.salaryMin + j.salaryMax) / 2); });
    return Object.values(g).map(x => ({ name: x.type, avg: Math.round(x.s.reduce((a, b) => a + b, 0) / x.s.length), min: Math.round(Math.min(...x.s)), max: Math.round(Math.max(...x.s)), count: x.s.length })).sort((a, b) => b.avg - a.avg);
  }, [jobs]);

  const byRole = useMemo(() => {
    const roleMap = (t) => { const l = t.toLowerCase(); if (l.includes("intern") || l.includes("co-op") || l.includes("extern")) return "Intern / Co-op"; if (l.includes("technician") || l.includes("tech")) return "Technician"; if (l.includes("assistant") || l.includes("trainee")) return "Research Assistant"; if (l.includes("associate") || l.includes("coordinator")) return "Associate / Coordinator"; if (l.includes("scientist") || l.includes("specialist") || l.includes("director") || l.includes("lead")) return "Scientist / Specialist"; return "Other"; };
    const g = {};
    jobs.forEach(j => { if (!j.salaryMin) return; const r = roleMap(j.title); if (!g[r]) g[r] = { role: r, s: [] }; g[r].s.push((j.salaryMin + j.salaryMax) / 2); });
    return ["Intern / Co-op", "Technician", "Research Assistant", "Associate / Coordinator", "Scientist / Specialist"].map(r => g[r]).filter(Boolean).map(x => ({ name: x.role, avg: Math.round(x.s.reduce((a, b) => a + b, 0) / x.s.length), min: Math.round(Math.min(...x.s)), max: Math.round(Math.max(...x.s)), count: x.s.length }));
  }, [jobs]);

  const byRegion = useMemo(() => {
    const g = { NYC: [], NJ: [] };
    jobs.forEach(j => { if (j.salaryMin) g[j.region].push((j.salaryMin + j.salaryMax) / 2); });
    return ["NYC", "NJ"].map(r => ({ name: r, avg: Math.round(g[r].reduce((a, b) => a + b, 0) / g[r].length), min: Math.round(Math.min(...g[r])), max: Math.round(Math.max(...g[r])), count: g[r].length }));
  }, [jobs]);

  const allSal = jobs.filter(j => j.salaryMin).map(j => (j.salaryMin + j.salaryMax) / 2);
  const sorted = [...allSal].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center"><p className="text-2xl font-bold text-gray-900">${(median / 1000).toFixed(0)}k</p><p className="text-xs text-gray-500">Median Salary</p></div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center"><p className="text-2xl font-bold text-indigo-600">{byEmployer[0]?.name}</p><p className="text-xs text-gray-500">Highest Paying Sector</p></div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center"><p className="text-2xl font-bold text-green-600">${(Math.min(...allSal) / 1000).toFixed(0)}k&ndash;${(Math.max(...allSal) / 1000).toFixed(0)}k</p><p className="text-xs text-gray-500">Full Salary Range</p></div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center"><p className="text-2xl font-bold text-gray-900">{allSal.length}/{jobs.length}</p><p className="text-xs text-gray-500">Jobs w/ Salary Data</p></div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Average Salary by Employer Type</h3>
        <p className="text-xs text-gray-500 mb-4">Pharma consistently pays 20&ndash;40% more than academic institutions for equivalent entry-level roles</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={byEmployer} layout="vertical" margin={{ left: 100, right: 20 }}>
            <XAxis type="number" tickFormatter={v => `$${v / 1000}k`} fontSize={11} />
            <YAxis type="category" dataKey="name" fontSize={11} width={90} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="avg" radius={[0, 4, 4, 0]}>{byEmployer.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Salary Progression by Role Level</h3>
        <p className="text-xs text-gray-500 mb-4">Career ladder from intern to scientist &mdash; shows typical new grad salary trajectory</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={byRole} margin={{ left: 10, right: 20 }}>
            <XAxis dataKey="name" fontSize={10} interval={0} angle={-15} textAnchor="end" height={50} />
            <YAxis tickFormatter={v => `$${v / 1000}k`} fontSize={11} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="avg" radius={[4, 4, 0, 0]}>{byRole.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">NYC vs NJ Salary Comparison</h3>
        <p className="text-xs text-gray-500 mb-4">NJ pharma corridor salaries are higher on average, with lower cost of living</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={byRegion} margin={{ left: 10, right: 20 }}>
            <XAxis dataKey="name" fontSize={12} />
            <YAxis tickFormatter={v => `$${v / 1000}k`} fontSize={11} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="avg" radius={[4, 4, 0, 0]}><Cell fill="#6366f1" /><Cell fill="#10b981" /></Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-gray-400 text-center">Salary data estimated from job postings and public compensation databases. Actual offers may vary.</p>
    </div>
  );
}
