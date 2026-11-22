import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

// GET: List all staff for the organization
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId') || '00000000-0000-0000-0000-000000000001';

    const { data: staff, error } = await supabaseAdmin
      .from('staff_whitelist')
      .select(`
        id,
        full_name,
        phone,
        role,
        is_active,
        created_at,
        assigned_ward_id,
        ward:wards(id, name, ward_number)
      `)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, staff: staff || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Add new staff or field volunteer
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, phone, role, pin, assignedWardId, organizationId } = body;

    if (!fullName || !phone || !pin) {
      return NextResponse.json({ error: 'Full name, phone, and 4-digit PIN required' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const pinHash = await bcrypt.hash(pin.toString(), 10);

    // Resolve organization ID
    let finalOrgId = organizationId;
    if (!finalOrgId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalOrgId)) {
      const { data: org } = await supabaseAdmin.from('organizations').select('id').limit(1).single();
      finalOrgId = org?.id;
    }

    const { data: newStaff, error } = await supabaseAdmin
      .from('staff_whitelist')
      .insert({
        organization_id: finalOrgId,
        full_name: fullName.trim(),
        phone: cleanPhone,
        role: role || 'VOLUNTEER',
        pin_hash: pinHash,
        assigned_ward_id: assignedWardId || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'This phone number is already registered' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, staff: newStaff });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Remove staff member
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get('id');

    if (!staffId) {
      return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('staff_whitelist')
      .delete()
      .eq('id', staffId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
