'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Share2,
  CheckCircle2,
  Clock,
  Award,
  ChevronLeft,
  Sparkles,
  TrendingUp,
  MapPin,
  Flame,
  FileText
} from 'lucide-react';
import { formatDDMMYYYY } from '@/lib/dateUtils';
import Link from 'next/link';

type DatePreset = 'THIS_MONTH' | 'PREV_MONTH' | 'LAST_3_MONTHS' | 'LAST_6_MONTHS' | 'LAST_YEAR' | 'CUSTOM';

export default function ExecutiveAnalyticsPage() {
  const [preset, setPreset] = useState<DatePreset>('THIS_MONTH');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(false);

  // Real KPI stats
  const [stats, setStats] = useState({
    totalReceived: 0,
    totalResolved: 0,
    inProgress: 0,
    resolutionRate: 0,
    avgTurnaroundHours: 0,
    categoryBreakdown: [] as { category: string; count: number; percentage: number }[],
    wardLeaderboard: [] as { wardName: string; resolved: number; total: number; rate: number }[],
    topVolunteers: [] as { name: string; resolvedCount: number }[],
  });

  useEffect(() => {
    fetchAnalytics();
  }, [preset, customStart, customEnd]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/management/analytics?preset=${preset}&start=${customStart}&end=${customEnd}`
      );
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white px-4 py-3 shadow-md border-b border-slate-800">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/management"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                <span>Executive Governance Pulse</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  REAL-TIME SQL
                </span>
              </h1>
              <p className="text-xs text-slate-400">Mangalagiri Assembly • Ramesh Darisi MLA</p>
            </div>
          </div>

          <button
            onClick={handlePrintPdf}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow transition-all"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export PDF Report</span>
          </button>
        </div>

        {/* 1-Tap Date Preset Pills */}
        <div className="max-w-5xl mx-auto mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { key: 'THIS_MONTH', label: 'This Month' },
            { key: 'PREV_MONTH', label: 'Previous Month' },
            { key: 'LAST_3_MONTHS', label: 'Last 3 Months' },
            { key: 'LAST_6_MONTHS', label: 'Last 6 Months' },
            { key: 'LAST_YEAR', label: 'Last Year' },
            { key: 'CUSTOM', label: '📅 Custom' },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key as DatePreset)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                preset === p.key
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === 'CUSTOM' && (
          <div className="max-w-5xl mx-auto mt-2 flex items-center gap-2 bg-slate-800 p-2 rounded-xl text-xs">
            <span className="text-slate-400">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-slate-900 text-white px-2 py-1 rounded border border-slate-700"
            />
            <span className="text-slate-400">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-slate-900 text-white px-2 py-1 rounded border border-slate-700"
            />
          </div>
        )}
      </header>

      {/* Main Analytics Canvas */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 space-y-5 pb-16">
        {/* Vibrant Executive KPI Scorecards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Card 1: Total Received */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Total Grievances
            </span>
            <span className="text-3xl font-black text-slate-900 mt-1 block">
              {stats.totalReceived}
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block">
              Registered via QR & Public Portal
            </span>
          </div>

          {/* Card 2: Resolved & Success Rate */}
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-2xl p-4 shadow-md shadow-emerald-600/20">
            <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider block">
              Resolved On Ground
            </span>
            <span className="text-3xl font-black text-white mt-1 block">
              {stats.totalResolved}
            </span>
            <span className="text-[11px] font-bold text-emerald-200 mt-1 block">
              {stats.resolutionRate}% Success Rate
            </span>
          </div>

          {/* Card 3: In Action */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Work In Action
            </span>
            <span className="text-3xl font-black text-amber-600 mt-1 block">
              {stats.inProgress}
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block">
              Active field volunteer tasks
            </span>
          </div>

          {/* Card 4: Avg Speed */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Average Turnaround
            </span>
            <span className="text-3xl font-black text-indigo-600 mt-1 block">
              {stats.avgTurnaroundHours}h
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block">
              From report to resolution
            </span>
          </div>
        </div>

        {/* Infographic Category Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Grievances Solved by Category</span>
            </h2>
            <span className="text-xs text-slate-400 font-medium">Auto Categorized</span>
          </div>

          <div className="space-y-3">
            {stats.categoryBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No category data in selected range</p>
            ) : (
              stats.categoryBreakdown.map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>{cat.category}</span>
                    <span>{cat.count} issues ({cat.percentage}%)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 2-Column Grid: Ward Leaderboard & Top Volunteers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Ward Leaderboard */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-500" />
              <span>Ward Performance Leaderboard</span>
            </h3>

            <div className="divide-y divide-slate-100">
              {stats.wardLeaderboard.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No ward data available</p>
              ) : (
                stats.wardLeaderboard.map((w, idx) => (
                  <div key={w.wardName} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 font-black text-slate-700 flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800">{w.wardName}</span>
                    </div>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {w.rate}% Resolved ({w.resolved}/{w.total})
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Volunteer Recognition */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Top Cadre Volunteers of the Period</span>
            </h3>

            <div className="divide-y divide-slate-100">
              {stats.topVolunteers.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No volunteer records in range</p>
              ) : (
                stats.topVolunteers.map((vol, idx) => (
                  <div key={vol.name} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                      <span className="font-bold text-slate-800">{vol.name}</span>
                    </div>
                    <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      {vol.resolvedCount} Resolved
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Printable Executive Sign-off Footer */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-white">Office of Ramesh Darisi, MLA</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Certified Official Grievance Redressal Audit • Mangalagiri Assembly
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrintPdf}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-4 h-4" /> Print Formal Report
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
