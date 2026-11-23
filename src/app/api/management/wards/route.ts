import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET: List wards for an organization
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    let query = supabaseAdmin.from('wards').select('*').order('ward_number', { ascending: true });
    if (orgId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId)) {
      query = query.eq('organization_id', orgId);
    }

    const { data: wards, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, wards: wards || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Add new ward
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { organizationId, wardNumber, name, inchargeName, inchargePhone } = body;

    if (!wardNumber || !name) {
      return NextResponse.json({ error: 'Ward number and name required' }, { status: 400 });
    }

    // Resolve organization ID
    let finalOrgId = organizationId;
    if (!finalOrgId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalOrgId)) {
      const { data: org } = await supabaseAdmin.from('organizations').select('id').limit(1).single();
      finalOrgId = org?.id;
    }

    const { data: newWard, error } = await supabaseAdmin
      .from('wards')
      .insert({
        organization_id: finalOrgId,
        ward_number: wardNumber.trim(),
        name: name.trim(),
        incharge_name: inchargeName?.trim() || null,
        incharge_phone: inchargePhone?.replace(/\D/g, '').slice(-10) || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, ward: newWard });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Edit existing ward
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, wardNumber, name } = body;

    if (!id || !wardNumber || !name) {
      return NextResponse.json({ error: 'Ward ID, number, and name are required' }, { status: 400 });
    }

    const { data: updatedWard, error } = await supabaseAdmin
      .from('wards')
      .update({
        ward_number: wardNumber.trim(),
        name: name.trim(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, ward: updatedWard });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Delete ward
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const wardId = searchParams.get('id');

    if (!wardId) {
      return NextResponse.json({ error: 'Ward ID required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('wards').delete().eq('id', wardId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
