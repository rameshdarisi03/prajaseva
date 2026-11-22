import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Resolve organization by UUID, clean org ID, or slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId);
    let orgQuery = supabaseAdmin.from('organizations').select('*');

    if (isUuid) {
      orgQuery = orgQuery.eq('id', orgId);
    } else {
      const cleanSlug = orgId.replace(/^org[_-]/i, '');
      orgQuery = orgQuery.or(`slug.eq.${orgId},slug.eq.org_${cleanSlug},slug.eq.${cleanSlug}`);
    }

    const { data: organization, error: orgErr } = await orgQuery.single();

    if (orgErr || !organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Fetch wards for this organization
    const { data: wards, error: wardsErr } = await supabaseAdmin
      .from('wards')
      .select('id, ward_number, name, incharge_name, incharge_phone')
      .eq('organization_id', organization.id)
      .order('ward_number', { ascending: true });

    if (wardsErr) {
      return NextResponse.json({ error: wardsErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        mlaName: organization.mla_name,
        mlaDesignation: organization.mla_designation,
        mlaPhotoUrl: organization.mla_photo_url,
        partyName: organization.party_name,
        partyLogoUrl: organization.party_logo_url,
        partyPrimaryColor: organization.party_primary_color,
        partySecondaryColor: organization.party_secondary_color,
        constituencySlogan: organization.constituency_slogan,
      },
      wards: wards || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
