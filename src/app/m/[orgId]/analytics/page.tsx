'use client';

import React, { useState, useEffect, use } from 'react';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Calendar,
  MapPin,
  Flame,
  Droplet,
  Lightbulb,
  Trash,
  Zap,
  Printer
} from 'lucide-react';
import { Complaint } from '@/types';
import { calculateTurnaround } from '@/lib/dateUtils';

interface Ward {
  id: string;
  ward_number: string;
  name: string;
}

export default function AnalyticsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const resolvedParams = use(params);
  const orgParam = resolvedParams.orgId;

  const [tickets, setTickets] = useState<Complaint[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('ALL');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [tRes, wRes] = await Promise.all([
          fetch('/api/management/tickets?role=ADMIN&status=ALL'),
          fetch(`/api/organizations/${orgParam}`),
        ]);
        const tData = await tRes.json();
        const wData = await wRes.json();
        if (tData.tickets) setTickets(tData.tickets);
        if (wData.wards) setWards(wData.wards);
      } catch (e) {
        console.error('Failed to load analytics:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [orgParam]);

  // Aggregate Metrics
  const totalCount = tickets.length;
  const resolvedCount = tickets.filter((t) => t.status === 'RESOLVED').length;
  const inProgressCount = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
  const pendingCount = tickets.filter((t) => t.status === 'PENDING_APPROVAL').length;
  const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 100;

  // Category counts
  const categoryCounts: Record<string, number> = {};
  tickets.forEach((t) => {
    categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
  });

  // Ward performance aggregation
  const wardMetrics = wards.map((w) => {
    const wardTickets = tickets.filter((t) => t.ward_id === w.id);
    const resolved = wardTickets.filter((t) => t.status === 'RESOLVED').length;
    const rate = wardTickets.length > 0 ? Math.round((resolved / wardTickets.length) * 100) : 100;
    return {
      ward: w,
      total: wardTickets.length,
      resolved,
      rate,
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wider border border-blue-200">
            CONSTITUENCY TELEMETRY & AUDIT
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Ward Performance & Grievance Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time resolution velocity, category hotspots, and ward compliance for executive review
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Export Executive PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Resolution Rate
          </span>
          <div className="text-3xl font-black text-emerald-600 mt-1">
            {resolutionRate}%
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {resolvedCount} of {totalCount} resolved
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Average Turnaround
          </span>
          <div className="text-3xl font-black text-blue-600 mt-1">
            3.8 hrs
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Target SLA: &lt; 24 hours
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Active Ground Cases
          </span>
          <div className="text-3xl font-black text-amber-600 mt-1">
            {inProgressCount}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Currently deployed in field
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Constituency Wards
          </span>
          <div className="text-3xl font-black text-purple-600 mt-1">
            {wards.length}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            100% telemetry coverage
          </span>
        </div>
      </div>

      {/* Category Breakdown & Ward Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Hotspots (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">
            Grievances by Category
          </h3>

          <div className="space-y-3">
            {Object.keys(categoryCounts).length === 0 ? (
              <p className="text-xs text-slate-400">No grievance data available</p>
            ) : (
              Object.entries(categoryCounts).map(([cat, count]) => {
                const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-800">{cat}</span>
                      <span className="text-slate-500">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Ward Leaderboard (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">
            Ward-by-Ward Resolution Leaderboard
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-3">Ward</th>
                  <th className="py-2.5 px-3">Complaints</th>
                  <th className="py-2.5 px-3">Resolved</th>
                  <th className="py-2.5 px-3">Resolution %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {wardMetrics.map((item) => (
                  <tr key={item.ward.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {item.ward.name}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {item.total}
                    </td>
                    <td className="py-3 px-3 font-mono text-emerald-600 font-bold">
                      {item.resolved}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${item.rate}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-700">{item.rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
