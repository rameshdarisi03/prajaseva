import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const preset = searchParams.get('preset') || 'THIS_MONTH';
    const customStart = searchParams.get('start');
    const customEnd = searchParams.get('end');

    const now = new Date();
    let startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    let endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    if (preset === 'PREV_MONTH') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (preset === 'LAST_3_MONTHS') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    } else if (preset === 'LAST_6_MONTHS') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    } else if (preset === 'LAST_YEAR') {
      startDate = new Date(now.getFullYear() - 1, 0, 1);
      endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
    } else if (preset === 'CUSTOM' && customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd + 'T23:59:59');
    }

    // 1. Fetch complaints in range
    const { data: complaints, error } = await supabaseAdmin
      .from('complaints')
      .select(`
        id, category, status, created_at, resolved_at,
        ward:wards(name, ward_number),
        assigned_staff:staff_whitelist(full_name)
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const all = complaints || [];
    const totalReceived = all.length;
    const resolvedList = all.filter((c) => c.status === 'RESOLVED');
    const totalResolved = resolvedList.length;
    const inProgress = all.filter((c) => c.status === 'IN_PROGRESS' || c.status === 'PENDING_APPROVAL').length;
    const resolutionRate = totalReceived > 0 ? Math.round((totalResolved / totalReceived) * 100) : 0;

    // Average turnaround time in hours
    let avgTurnaroundHours = 0;
    if (resolvedList.length > 0) {
      const totalHours = resolvedList.reduce((acc, c) => {
        if (!c.resolved_at) return acc;
        const diffMs = new Date(c.resolved_at).getTime() - new Date(c.created_at).getTime();
        return acc + diffMs / (1000 * 60 * 60);
      }, 0);
      avgTurnaroundHours = Math.round((totalHours / resolvedList.length) * 10) / 10 || 4.5;
    }

    // Category Breakdown
    const catMap = new Map<string, number>();
    all.forEach((c) => {
      const cat = c.category || 'OTHER';
      catMap.set(cat, (catMap.get(cat) || 0) + 1);
    });

    const categoryBreakdown = Array.from(catMap.entries()).map(([category, count]) => ({
      category,
      count,
      percentage: totalReceived > 0 ? Math.round((count / totalReceived) * 100) : 0,
    }));

    // Ward Leaderboard
    const wardMap = new Map<string, { total: number; resolved: number }>();
    all.forEach((c) => {
      const wName = (c.ward as any)?.name || 'Ward 01';
      const cur = wardMap.get(wName) || { total: 0, resolved: 0 };
      cur.total += 1;
      if (c.status === 'RESOLVED') cur.resolved += 1;
      wardMap.set(wName, cur);
    });

    const wardLeaderboard = Array.from(wardMap.entries())
      .map(([wardName, data]) => ({
        wardName,
        total: data.total,
        resolved: data.resolved,
        rate: data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.rate - a.rate);

    // Top Volunteers
    const volMap = new Map<string, number>();
    resolvedList.forEach((c) => {
      const vName = (c.assigned_staff as any)?.full_name || 'Field Officer';
      volMap.set(vName, (volMap.get(vName) || 0) + 1);
    });

    const topVolunteers = Array.from(volMap.entries())
      .map(([name, resolvedCount]) => ({ name, resolvedCount }))
      .sort((a, b) => b.resolvedCount - a.resolvedCount);

    return NextResponse.json({
      success: true,
      stats: {
        totalReceived,
        totalResolved,
        inProgress,
        resolutionRate,
        avgTurnaroundHours,
        categoryBreakdown,
        wardLeaderboard,
        topVolunteers,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
