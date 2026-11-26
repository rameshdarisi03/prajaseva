import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveComplaintFolder, uploadToZohoWorkDrive } from '@/lib/zoho';
import { sendTicketConfirmation } from '@/lib/whatsapp';
import { formatDDMMYYYY } from '@/lib/dateUtils';
import { verifySignedOtpToken } from '@/lib/otpStore';

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
      organizationId,
      organizationSlug = 'mangalagiri',
      wardId,
    } = body;

    if (!citizenName || !citizenPhone || !category || !photoBase64 || !latitude || !longitude) {
      return NextResponse.json(
        { error: 'Missing required complaint parameters' },
        { status: 400 }
      );
    }

    const cleanCitizenPhone = String(citizenPhone).replace(/\D/g, '').slice(-10);
    const verifiedCookie = req.cookies.get('ps_citizen_verified')?.value;
    const otpCheck = verifySignedOtpToken(verifiedCookie, `verified_${cleanCitizenPhone}`, 'VERIFIED');
    if (!otpCheck.valid) {
      return NextResponse.json(
        { error: 'Please verify your WhatsApp mobile number via OTP before submitting a complaint.' },
        { status: 401 }
      );
    }

    // 1. Fetch Organization Details (by UUID, clean org ID, or slug)
    let orgQuery = supabaseAdmin.from('organizations').select('*');
    if (organizationId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(organizationId);
      if (isUuid) {
        orgQuery = orgQuery.eq('id', organizationId);
      } else {
        const cleanSlug = organizationId.replace(/^org[_-]/i, '');
        orgQuery = orgQuery.or(`slug.eq.${organizationId},slug.eq.org_${cleanSlug},slug.eq.${cleanSlug}`);
      }
    } else {
      const cleanSlug = organizationSlug.replace(/^org[_-]/i, '');
      orgQuery = orgQuery.or(`slug.eq.${organizationSlug},slug.eq.org_${cleanSlug},slug.eq.${cleanSlug}`);
    }
    const { data: org, error: orgError } = await orgQuery.single();

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

    // 3. Match Ward (use explicitly selected wardId if provided, or default to first ward)
    const { data: wards } = await supabaseAdmin
      .from('wards')
      .select('*')
      .eq('organization_id', org.id)
      .order('ward_number', { ascending: true });

    let matchedWard = wards?.[0];
    if (wardId) {
      const explicitWard = wards?.find(w => w.id === wardId);
      if (explicitWard) {
        matchedWard = explicitWard;
      }
    }
    const wardNumber = matchedWard?.ward_number || '01';
    const wardName = matchedWard?.name || 'General Constituency';

    // 4. Upload photo & voice note to Supabase Storage (for instant web CDN) + Zoho WorkDrive (for archive)
    let beforePhotoUrl = photoBase64; // fallback
    let finalVoiceNoteUrl = voiceNoteUrl || null;

    try {
      const photoRaw = photoBase64.includes(';base64,') ? photoBase64.split(';base64,')[1] : photoBase64;
      const photoBuffer = Buffer.from(photoRaw, 'base64');

      // 4a. Upload to Supabase Storage for reliable, instant CDN rendering
      const photoStoragePath = `evidence/${ticketNumber}_before.jpg`;
      const { error: photoUploadErr } = await supabaseAdmin.storage
        .from('complaints')
        .upload(photoStoragePath, photoBuffer, { contentType: 'image/jpeg', upsert: true });

      if (!photoUploadErr) {
        const { data: pubPhoto } = supabaseAdmin.storage
          .from('complaints')
          .getPublicUrl(photoStoragePath);
        beforePhotoUrl = pubPhoto.publicUrl;
      }

      // 4b. Upload voice note to Supabase Storage if recorded
      if (voiceNoteUrl && voiceNoteUrl.startsWith('data:audio')) {
        const audioRaw = voiceNoteUrl.includes(';base64,') ? voiceNoteUrl.split(';base64,')[1] : voiceNoteUrl;
        const audioBuffer = Buffer.from(audioRaw, 'base64');
        const audioStoragePath = `voice/${ticketNumber}_audio.webm`;
        const { error: audioUploadErr } = await supabaseAdmin.storage
          .from('complaints')
          .upload(audioStoragePath, audioBuffer, { contentType: 'audio/webm', upsert: true });

        if (!audioUploadErr) {
          const { data: pubAudio } = supabaseAdmin.storage
            .from('complaints')
            .getPublicUrl(audioStoragePath);
          finalVoiceNoteUrl = pubAudio.publicUrl;
        }

        // Secondary: Archive voice in Zoho WorkDrive
        resolveComplaintFolder({
          constituencyName: org.name,
          wardNumber: wardNumber,
          ticketNumber: ticketNumber,
          date: new Date(),
        }).then((folderId) => {
          uploadToZohoWorkDrive(folderId, `voice_${ticketNumber}.webm`, audioBuffer, 'audio/webm').catch(console.warn);
        }).catch(console.warn);
      }

      // 4c. Secondary: Archive photo in Zoho WorkDrive
      resolveComplaintFolder({
        constituencyName: org.name,
        wardNumber: wardNumber,
        ticketNumber: ticketNumber,
        date: new Date(),
      }).then((folderId) => {
        uploadToZohoWorkDrive(folderId, `before_${ticketNumber}.jpg`, photoBuffer, 'image/jpeg').catch(console.warn);
      }).catch(console.warn);

    } catch (mediaError) {
      console.error('[Media Storage Error - fallback to direct]:', mediaError);
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

    const res = NextResponse.json({
      success: true,
      ticketNumber: ticketNumber,
      complaint: complaint,
    });
    res.cookies.delete('ps_citizen_verified');
    return res;
  } catch (err: any) {
    console.error('[Complaint Submission API Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
