import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveComplaintFolder, uploadToZohoWorkDrive } from '@/lib/zoho';
import { sendTicketConfirmation } from '@/lib/whatsapp';
import { formatDDMMYYYY } from '@/lib/dateUtils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      citizenName,
      citizenPhone,
      citizenEmail,
      category,
      description,
      voiceNoteUrl,
      latitude,
      longitude,
      locationAddress,
      photoBase64,
      organizationSlug = 'mangalagiri',
    } = body;

    if (!citizenName || !citizenPhone || !category || !photoBase64 || !latitude || !longitude) {
      return NextResponse.json(
        { error: 'Missing required complaint parameters' },
        { status: 400 }
      );
    }

    // 1. Fetch Organization Details
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('slug', organizationSlug)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: 'Constituency organization not found' }, { status: 404 });
    }

    // 2. Determine sequential ticket number atomically
    let ticketNumber = 'CMP-1001';
    try {
      const { data: generatedRef } = await supabaseAdmin.rpc('get_next_ticket_number', {
        org_uuid: org.id,
      });
      if (generatedRef) {
        ticketNumber = generatedRef;
      } else {
        const { count } = await supabaseAdmin
          .from('complaints')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', org.id);
        ticketNumber = `CMP-${1001 + (count || 0)}`;
      }
    } catch {
      ticketNumber = `CMP-${Date.now().toString().slice(-4)}`;
    }

    // 3. Match Ward by closest distance or default to Ward 01
    const { data: wards } = await supabaseAdmin
      .from('wards')
      .select('*')
      .eq('organization_id', org.id)
      .order('ward_number', { ascending: true });

    const matchedWard = wards?.[0]; // Default to first ward if PostGIS bounds not mapped yet
    const wardNumber = matchedWard?.ward_number || '01';
    const wardName = matchedWard?.name || 'General Constituency';

    // 4. Upload photo & voice note to Zoho WorkDrive
    let beforePhotoUrl = photoBase64; // fallback
    let finalVoiceNoteUrl = voiceNoteUrl || null;
    try {
      const folderId = await resolveComplaintFolder({
        constituencyName: org.name,
        wardNumber: wardNumber,
        ticketNumber: ticketNumber,
        date: new Date(),
      });

      // Convert photo base64 to buffer safely
      const photoRaw = photoBase64.includes(';base64,') ? photoBase64.split(';base64,')[1] : photoBase64;
      const buffer = Buffer.from(photoRaw, 'base64');

      beforePhotoUrl = await uploadToZohoWorkDrive(
        folderId,
        `before_${ticketNumber}.jpg`,
        buffer,
        'image/jpeg'
      );

      // Upload voice note to Zoho WorkDrive if recorded
      if (voiceNoteUrl && voiceNoteUrl.startsWith('data:audio')) {
        const audioRaw = voiceNoteUrl.includes(';base64,') ? voiceNoteUrl.split(';base64,')[1] : voiceNoteUrl;
        const audioBuffer = Buffer.from(audioRaw, 'base64');
        finalVoiceNoteUrl = await uploadToZohoWorkDrive(
          folderId,
          `voice_${ticketNumber}.webm`,
          audioBuffer,
          'audio/webm'
        );
      }
    } catch (zohoError) {
      console.error('[Zoho Upload Error - Fallback to direct]:', zohoError);
    }

    const finalLocationAddress = locationAddress || `GPS (${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)})`;

    // 5. Insert Complaint into Supabase
    const { data: complaint, error: insertError } = await supabaseAdmin
      .from('complaints')
      .insert({
        organization_id: org.id,
        ticket_number: ticketNumber,
        citizen_name: citizenName,
        citizen_phone: citizenPhone,
        citizen_email: citizenEmail || null,
        is_phone_verified: true,
        category: category,
        description: description || null,
        voice_note_url: finalVoiceNoteUrl,
        latitude: latitude,
        longitude: longitude,
        location_address: finalLocationAddress,
        ward_id: matchedWard?.id || null,
        before_photo_url: beforePhotoUrl,
        status: 'NEW',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Supabase Insert Error]:', insertError.message, insertError.details, insertError.hint);
      return NextResponse.json(
        { error: insertError.message || 'Failed to record complaint in database' },
        { status: 500 }
      );
    }

    // 6. Send Ticket Confirmation to Citizen WhatsApp via Meta Cloud API
    try {
      await sendTicketConfirmation({
        phone: citizenPhone,
        citizenName: citizenName,
        ticketNumber: ticketNumber,
        category: category,
        wardName: wardName,
      });
    } catch (waError) {
      console.error('[WhatsApp Notification Error]:', waError);
    }

    return NextResponse.json({
      success: true,
      ticketNumber: ticketNumber,
      complaint: complaint,
    });
  } catch (err: any) {
    console.error('[Complaint Submission API Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
