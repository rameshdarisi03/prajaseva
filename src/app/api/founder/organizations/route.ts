import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifySignedOtpToken } from '@/lib/otpStore';
import { sendStaffOnboardingMessage } from '@/lib/whatsapp';

function verifyFounderRequest(req: NextRequest): boolean {
  const masterPhone = (process.env.FOUNDER_PHONE || '9206651295').replace(/\D/g, '').slice(-10);
  const sessionCookie = req.cookies.get('ps_founder_session')?.value;
  return verifySignedOtpToken(sessionCookie, `founder_${masterPhone}`, 'AUTHENTICATED').valid;
}

// GET: List all enrolled constituencies + live counts (staff, wards, complaints)
export async function GET(req: NextRequest) {
  if (!verifyFounderRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized: Founder session required' }, { status: 401 });
  }

  try {
    const [orgsRes, staffRes, wardsRes, complaintsRes] = await Promise.all([
      supabaseAdmin.from('organizations').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('staff_whitelist').select('id, organization_id, is_active').eq('is_active', true),
      supabaseAdmin.from('wards').select('id, organization_id'),
      supabaseAdmin.from('complaints').select('id, organization_id, status'),
    ]);

    if (orgsRes.error) {
      return NextResponse.json({ error: orgsRes.error.message }, { status: 500 });
    }

    const staffList = staffRes.data || [];
    const wardsList = wardsRes.data || [];
    const complaintsList = complaintsRes.data || [];

    const enriched = (orgsRes.data || []).map((org) => {
      const orgComplaints = complaintsList.filter((c) => c.organization_id === org.id);
      return {
        ...org,
        stats: {
          staffCount: staffList.filter((s) => s.organization_id === org.id).length,
          wardCount: wardsList.filter((w) => w.organization_id === org.id).length,
          complaintCount: orgComplaints.length,
          resolvedCount: orgComplaints.filter((c) => c.status === 'RESOLVED').length,
        },
      };
    });

    return NextResponse.json({ success: true, organizations: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Enroll a new constituency/organization + Primary Admin + Initial Wards + BYOK Slots
export async function POST(req: NextRequest) {
  if (!verifyFounderRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized: Founder session required' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      name,
      slug,
      founderPhone,
      adminName,
      mlaName,
      mlaDesignation,
      partyName,
      partyPrimaryColor,
      partySecondaryColor,
      constituencySlogan,
      customDomain,
      whatsappGroupMla,
      whatsappGroupTown,
      infrastructureMode,
      customSupabaseUrl,
      customSupabaseAnonKey,
      customWhatsappPhoneNumberId,
      customWhatsappAccessToken,
      customZohoFolderId,
      initialWardCount = 5,
    } = body;

    if (!name?.trim() || !slug?.trim() || !founderPhone?.trim() || !mlaName?.trim()) {
      return NextResponse.json(
        { error: 'Constituency Name, Slug, Leader Name, and Admin Mobile are required.' },
        { status: 400 }
      );
    }

    const cleanPhone = String(founderPhone).replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return NextResponse.json({ error: 'Valid 10-digit Indian mobile number required.' }, { status: 400 });
    }

    const cleanSlug = String(slug)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_{2,}/g, '_');

    const { data: newOrg, error: orgErr } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: name.trim(),
        slug: cleanSlug,
        custom_domain: customDomain?.trim() || null,
        founder_phone: cleanPhone,
        mla_name: mlaName.trim(),
        mla_designation: mlaDesignation?.trim() || 'Member of Legislative Assembly (MLA)',
        party_name: partyName?.trim() || null,
        party_primary_color: partyPrimaryColor || '#16A34A',
        party_secondary_color: partySecondaryColor || '#F59E0B',
        constituency_slogan: constituencySlogan?.trim() || 'ప్రజల కోసం... ప్రజా సేవలో...',
        whatsapp_group_mla: whatsappGroupMla?.trim() || null,
        whatsapp_group_town: whatsappGroupTown?.trim() || null,
        infrastructure_mode: infrastructureMode === 'DEDICATED_BYOK' ? 'DEDICATED_BYOK' : 'SHARED',
        custom_supabase_url: customSupabaseUrl?.trim() || null,
        custom_supabase_anon_key: customSupabaseAnonKey?.trim() || null,
        custom_whatsapp_phone_number_id: customWhatsappPhoneNumberId?.trim() || null,
        custom_whatsapp_access_token: customWhatsappAccessToken?.trim() || null,
        custom_zoho_folder_id: customZohoFolderId?.trim() || null,
      })
      .select()
      .single();

    if (orgErr) {
      if (orgErr.code === '23505') {
        return NextResponse.json(
          { error: 'An organization with this slug or custom domain already exists.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: orgErr.message }, { status: 500 });
    }

    // 1. Seed Primary Constituency Admin in staff_whitelist
    const primaryAdminName = adminName?.trim() || `${mlaName.trim()} (Admin)`;
    await supabaseAdmin.from('staff_whitelist').insert({
      organization_id: newOrg.id,
      full_name: primaryAdminName,
      phone: cleanPhone,
      role: 'ADMIN',
      pin_hash: '',
      assigned_ward_id: null,
      assigned_ward_ids: [],
      is_active: true,
    });

    // 2. Seed Initial Wards so Citizen Portal is immediately usable
    const wardTotal = Math.min(Math.max(Number(initialWardCount) || 1, 1), 50);
    const wardRows = Array.from({ length: wardTotal }, (_, idx) => {
      const num = String(idx + 1).padStart(2, '0');
      return {
        organization_id: newOrg.id,
        ward_number: num,
        name: `Ward ${num}`,
      };
    });
    await supabaseAdmin.from('wards').insert(wardRows);

    // 3. Dispatch WhatsApp Onboarding Message to Constituency Admin
    try {
      await sendStaffOnboardingMessage({
        phone: cleanPhone,
        fullName: primaryAdminName,
        role: 'ADMIN',
        orgName: newOrg.name,
      });
    } catch (e) {
      console.warn('[Founder Org Enroll WhatsApp Note]:', e);
    }

    return NextResponse.json({ success: true, organization: newOrg });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH: Update BYOK infrastructure slots, branding, or WhatsApp channels
export async function PATCH(req: NextRequest) {
  if (!verifyFounderRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized: Founder session required' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      id,
      name,
      customDomain,
      mlaName,
      mlaDesignation,
      partyName,
      partyPrimaryColor,
      partySecondaryColor,
      constituencySlogan,
      whatsappGroupMla,
      whatsappGroupTown,
      infrastructureMode,
      customSupabaseUrl,
      customSupabaseAnonKey,
      customWhatsappPhoneNumberId,
      customWhatsappAccessToken,
      customZohoFolderId,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('organizations')
      .update({
        ...(name ? { name: name.trim() } : {}),
        custom_domain: customDomain?.trim() || null,
        ...(mlaName ? { mla_name: mlaName.trim() } : {}),
        ...(mlaDesignation ? { mla_designation: mlaDesignation.trim() } : {}),
        party_name: partyName?.trim() || null,
        ...(partyPrimaryColor ? { party_primary_color: partyPrimaryColor } : {}),
        ...(partySecondaryColor ? { party_secondary_color: partySecondaryColor } : {}),
        ...(constituencySlogan ? { constituency_slogan: constituencySlogan.trim() } : {}),
        whatsapp_group_mla: whatsappGroupMla?.trim() || null,
        whatsapp_group_town: whatsappGroupTown?.trim() || null,
        infrastructure_mode: infrastructureMode === 'DEDICATED_BYOK' ? 'DEDICATED_BYOK' : 'SHARED',
        custom_supabase_url: customSupabaseUrl?.trim() || null,
        custom_supabase_anon_key: customSupabaseAnonKey?.trim() || null,
        custom_whatsapp_phone_number_id: customWhatsappPhoneNumberId?.trim() || null,
        custom_whatsapp_access_token: customWhatsappAccessToken?.trim() || null,
        custom_zoho_folder_id: customZohoFolderId?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, organization: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
