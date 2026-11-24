import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { sendStaffOnboardingMessage } from '@/lib/whatsapp';
import { otpStore } from '@/lib/otpStore';

// GET: List all staff for the organization with their assigned wards
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId') || '00000000-0000-0000-0000-000000000001';

    const [staffRes, wardsRes] = await Promise.all([
      supabaseAdmin
        .from('staff_whitelist')
        .select(`
          id,
          full_name,
          phone,
          role,
          is_active,
          created_at,
          assigned_ward_id,
          assigned_ward_ids,
          ward:wards(id, name, ward_number)
        `)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('wards')
        .select('id, name, ward_number')
        .order('ward_number', { ascending: true })
    ]);

    if (staffRes.error) return NextResponse.json({ error: staffRes.error.message }, { status: 500 });

    const allWards = wardsRes.data || [];
    const wardMap = new Map(allWards.map(w => [w.id, w]));

    // Enrich each staff member with their full assigned wards list
    const enrichedStaff = (staffRes.data || []).map(member => {
      const wardIds: string[] = Array.isArray(member.assigned_ward_ids) && member.assigned_ward_ids.length > 0
        ? member.assigned_ward_ids
        : member.assigned_ward_id
        ? [member.assigned_ward_id]
        : [];

      const assignedWards = wardIds
        .map(id => wardMap.get(id))
        .filter(Boolean);

      return {
        ...member,
        assigned_ward_ids: wardIds,
        assigned_wards: assignedWards,
      };
    });

    return NextResponse.json({ success: true, staff: enrichedStaff });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Add new staff or field volunteer with N assigned wards
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, phone, role, pin, assignedWardIds, assignedWardId, organizationId } = body;

    if (!fullName || !phone) {
      return NextResponse.json({ error: 'Full name and phone number required' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const pinHash = pin ? await bcrypt.hash(pin.toString(), 10) : null;

    // Normalize assigned ward IDs array
    let normalizedWardIds: string[] = [];
    if (role === 'VOLUNTEER') {
      if (Array.isArray(assignedWardIds)) {
        normalizedWardIds = assignedWardIds;
      } else if (assignedWardId) {
        normalizedWardIds = [assignedWardId];
      }
    }

    // Resolve organization ID & Name (supports both UUID and slug e.g. 'org_mangalagiri')
    let finalOrgId = organizationId;
    let orgName = 'Mangalagiri Assembly Constituency';

    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .or(`slug.eq.${organizationId || 'org_mangalagiri'},id.eq.${/^[0-9a-f-]{36}$/i.test(organizationId || '') ? organizationId : '00000000-0000-0000-0000-000000000001'}`)
      .limit(1)
      .maybeSingle();

    if (org) {
      finalOrgId = org.id;
      if (org.name) orgName = org.name;
    }

    // Resolve assigned ward names for the onboarding message
    let assignedWardsSummary = 'All Wards (నియోజకవర్గం అంతటా)';
    if (role === 'VOLUNTEER' && normalizedWardIds.length > 0) {
      const { data: wardsList } = await supabaseAdmin
        .from('wards')
        .select('name, ward_number')
        .in('id', normalizedWardIds);
      if (wardsList && wardsList.length > 0) {
        assignedWardsSummary = wardsList
          .map((w) => `${w.name} ${w.ward_number ? `(#${w.ward_number})` : ''}`)
          .join(', ');
      }
    }

    const { data: newStaff, error } = await supabaseAdmin
      .from('staff_whitelist')
      .insert({
        organization_id: finalOrgId,
        full_name: fullName.trim(),
        phone: cleanPhone,
        role: role || 'VOLUNTEER',
        pin_hash: pinHash,
        assigned_ward_id: normalizedWardIds[0] || null,
        assigned_ward_ids: normalizedWardIds,
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

    // Automated WhatsApp Onboarding Message Dispatch
    try {
      await sendStaffOnboardingMessage({
        phone: cleanPhone,
        fullName: fullName.trim(),
        role: role || 'VOLUNTEER',
        orgName,
        assignedWardsText: assignedWardsSummary,
      });
    } catch (msgErr) {
      console.warn('[Staff Onboarding WhatsApp Dispatch Note]:', msgErr);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prajaseva-one.vercel.app';
    const roleTitle = role === 'ADMIN' ? 'Secretariat Admin' : 'Field Volunteer';
    const inviteText = encodeURIComponent(
      `Hello ${fullName.trim()},\n\nYou have been officially enrolled as a ${roleTitle} for ${orgName} on the Praja Seva Portal.\n\nLogin to your dashboard here:\n${appUrl}/login\n\nEnter your registered mobile number (+91 ${cleanPhone}) to set your private 4-digit PIN via WhatsApp OTP.`
    );
    const whatsappInviteUrl = `https://wa.me/91${cleanPhone}?text=${inviteText}`;

    return NextResponse.json({
      success: true,
      staff: newStaff,
      whatsappInviteUrl,
      orgName,
    });
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

    // 1. Fetch staff phone before deleting to clean up any in-memory OTP tokens
    const { data: member } = await supabaseAdmin
      .from('staff_whitelist')
      .select('phone')
      .eq('id', staffId)
      .maybeSingle();

    if (member?.phone) {
      const clean = member.phone.replace(/\D/g, '').slice(-10);
      otpStore.delete(clean);
      otpStore.delete(`reset_${clean}`);
    }

    // 2. Hard delete the staff record
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
