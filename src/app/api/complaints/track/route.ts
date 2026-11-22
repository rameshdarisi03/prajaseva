import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim();

    if (!query) {
      return NextResponse.json({ error: 'Search query required' }, { status: 400 });
    }

    // Clean query
    const isTicket = query.toUpperCase().startsWith('CMP-');
    const cleanPhone = query.replace(/\D/g, '');

    let dbQuery = supabaseAdmin
      .from('complaints')
      .select(`
        *,
        ward:wards(name, ward_number),
        assigned_staff:staff_whitelist(full_name, phone)
      `)
      .order('created_at', { ascending: false });

    if (isTicket) {
      dbQuery = dbQuery.eq('ticket_number', query.toUpperCase());
    } else {
      // Search by phone (match last 10 digits)
      const last10 = cleanPhone.slice(-10);
      dbQuery = dbQuery.ilike('citizen_phone', `%${last10}%`);
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
