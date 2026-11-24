import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('query') || searchParams.get('q'))?.trim();

    if (!query) {
      return NextResponse.json({ error: 'Search query required' }, { status: 400 });
    }

    // Clean query
    const raw = query.trim();
    const cleanDigits = raw.replace(/\D/g, '');
    const isTicketPrefix = raw.toUpperCase().startsWith('CMP-') || raw.toUpperCase().startsWith('CMP');

    let dbQuery = supabaseAdmin
      .from('complaints')
      .select(`
        id,
        ticket_number,
        category,
        description,
        location_address,
        latitude,
        longitude,
        status,
        created_at,
        assigned_at,
        work_started_at,
        submitted_for_approval_at,
        resolved_at,
        before_photo_url,
        after_photo_url,
        poster_url,
        rejection_reason,
        citizen_name,
        citizen_phone,
        ward:wards(name, ward_number)
      `)
      .order('created_at', { ascending: false });

    if (isTicketPrefix) {
      // User entered full ticket like "CMP-1007" or "cmp1007"
      const normalizedTicket = raw.toUpperCase().startsWith('CMP-')
        ? raw.toUpperCase()
        : `CMP-${raw.toUpperCase().replace('CMP', '').replace('-', '')}`;
      dbQuery = dbQuery.or(`ticket_number.eq.${normalizedTicket},ticket_number.ilike.${raw.toUpperCase()}`);
    } else if (cleanDigits.length >= 10) {
      // User entered 10 or 12 digit phone number
      const last10 = cleanDigits.slice(-10);
      dbQuery = dbQuery.ilike('citizen_phone', `%${last10}%`);
    } else if (/^\d{3,6}$/.test(raw)) {
      // User entered short number like "1007"
      dbQuery = dbQuery.or(`ticket_number.eq.CMP-${raw},ticket_number.eq.${raw},citizen_phone.ilike.%${raw}%`);
    } else {
      // General search fallback
      dbQuery = dbQuery.or(`ticket_number.ilike.%${raw}%,citizen_phone.ilike.%${raw}%,citizen_name.ilike.%${raw}%`);
    }

    const { data: complaints, error } = await dbQuery.limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      complaints: complaints || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
