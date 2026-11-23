import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveComplaintFolder, uploadToZohoWorkDrive } from '@/lib/zoho';
import { broadcastResolutionPoster } from '@/lib/whatsapp';
import { calculateTurnaround, formatDDMMYYYY } from '@/lib/dateUtils';

// Haversine formula to compute distance in meters between two coordinates
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// GET: List tickets with Role-Based Scoping
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const staffId = searchParams.get('staffId');
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('complaints')
      .select(`
        *,
        ward:wards(id, name, ward_number),
        assigned_staff:staff_whitelist(id, full_name, phone)
      `)
      .order('created_at', { ascending: false });

    // Scoped view: Volunteer can ONLY see assigned tickets
    if (role === 'VOLUNTEER' && staffId) {
      query = query.eq('assigned_to', staffId);
    }

    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }

    const { data: tickets, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Also fetch active volunteers list for Admin assignment dropdown
    let volunteers: any[] = [];
    if (role === 'ADMIN') {
      const { data: vList } = await supabaseAdmin
        .from('staff_whitelist')
        .select('id, full_name, phone, role, assigned_ward_id, assigned_ward_ids')
        .eq('is_active', true);
      volunteers = vList || [];
    }

    return NextResponse.json({
      success: true,
      tickets: tickets || [],
      volunteers,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Ticket Operations (Assign, Submit Proof, Approve Resolution)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ticketId, volunteerId, afterPhotoBase64, volunteerLat, volunteerLng, rejectionReason, posterBase64 } = body;

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID required' }, { status: 400 });
    }

    // 1. ACTION: ASSIGN TICKET TO VOLUNTEER
    if (action === 'assign') {
      const { data, error } = await supabaseAdmin
        .from('complaints')
        .update({
          assigned_to: volunteerId,
          status: 'IN_PROGRESS',
          assigned_at: new Date().toISOString(),
        })
        .eq('id', ticketId)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, complaint: data });
    }

    // 2. ACTION: VOLUNTEER SUBMITS FIELD PROOF FOR APPROVAL
    if (action === 'submit_resolution') {
      if (!afterPhotoBase64) {
        return NextResponse.json({ error: 'After photo is required' }, { status: 400 });
      }

      // Fetch complaint for GPS comparison & Zoho upload
      const { data: complaint } = await supabaseAdmin
        .from('complaints')
        .select('*, organization:organizations(*), ward:wards(*)')
        .eq('id', ticketId)
        .single();

      if (!complaint) return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });

      // Hardware Proximity Check
      let proximityMeters = 0;
      let isProximityVerified = false;
      if (volunteerLat && volunteerLng && complaint.latitude && complaint.longitude) {
        proximityMeters = getDistanceMeters(
          Number(complaint.latitude),
          Number(complaint.longitude),
          Number(volunteerLat),
          Number(volunteerLng)
        );
        isProximityVerified = proximityMeters <= 150; // within 150m is verified
      }

      // 1. Process After Photo: Upload to Supabase Storage for direct CDN rendering
      let afterPhotoUrl = afterPhotoBase64;
      const base64Data = afterPhotoBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      try {
        const storagePath = `resolution/${complaint.ticket_number}_after.jpg`;
        const { error: supaErr } = await supabaseAdmin.storage
          .from('complaints')
          .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true });

        if (!supaErr) {
          const { data: pubData } = supabaseAdmin.storage
            .from('complaints')
            .getPublicUrl(storagePath);
          afterPhotoUrl = pubData.publicUrl;
        }
      } catch (uploadErr) {
        console.error('[Supabase Storage After Photo Error]:', uploadErr);
      }

      // 2. Archive into Zoho WorkDrive according to hierarchy: /[Constituency]/[Ward]/[Date]/[TicketNumber]/
      try {
        const folderId = await resolveComplaintFolder({
          constituencyName: complaint.organization?.name || 'Mangalagiri',
          wardNumber: complaint.ward?.ward_number || '01',
          ticketNumber: complaint.ticket_number,
        });

        uploadToZohoWorkDrive(
          folderId,
          `after_${complaint.ticket_number}.jpg`,
          buffer,
          'image/jpeg'
        ).catch((zErr) => console.error('[Zoho Async Upload Error]:', zErr));
      } catch (e) {
        console.error('[Zoho Resolve Folder Error]:', e);
      }

      const { data: updated, error } = await supabaseAdmin
        .from('complaints')
        .update({
          after_photo_url: afterPhotoUrl,
          volunteer_upload_lat: volunteerLat || null,
          volunteer_upload_lng: volunteerLng || null,
          proximity_meters: proximityMeters,
          is_proximity_verified: isProximityVerified,
          status: 'PENDING_APPROVAL',
          submitted_for_approval_at: new Date().toISOString(),
        })
        .eq('id', ticketId)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, complaint: updated });
    }

    // 3. ACTION: ADMIN APPROVES RESOLUTION (TRIGGERS POSTER & WHATSAPP)
    if (action === 'approve_resolution') {
      const { data: complaint } = await supabaseAdmin
        .from('complaints')
        .select('*, organization:organizations(*), ward:wards(*)')
        .eq('id', ticketId)
        .single();

      if (!complaint) return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });

      const resolvedAt = new Date().toISOString();
      const turnaroundStr = calculateTurnaround(complaint.created_at, resolvedAt);

      // Default fallback if no poster image was supplied
      let posterUrl = complaint.poster_url || complaint.after_photo_url || complaint.before_photo_url;

      // If high-resolution 4:5 Victory Poster JPEG was captured from frontend, upload to Supabase Storage CDN & Zoho WorkDrive
      if (posterBase64 && typeof posterBase64 === 'string' && posterBase64.startsWith('data:image')) {
        try {
          const raw = posterBase64.includes(';base64,') ? posterBase64.split(';base64,')[1] : posterBase64;
          const buffer = Buffer.from(raw, 'base64');
          const posterStoragePath = `posters/${complaint.ticket_number}_victory_poster_${Date.now()}.jpg`;

          const { error: uploadErr } = await supabaseAdmin.storage
            .from('complaints')
            .upload(posterStoragePath, buffer, { contentType: 'image/jpeg', upsert: true });

          if (!uploadErr) {
            const { data: pubData } = supabaseAdmin.storage
              .from('complaints')
              .getPublicUrl(posterStoragePath);
            posterUrl = pubData.publicUrl;
          } else {
            console.error('[Supabase Poster Upload Error]:', uploadErr);
          }

          // Archive official victory poster to Zoho WorkDrive
          const folderId = await resolveComplaintFolder({
            constituencyName: complaint.organization?.name || 'Mangalagiri',
            wardNumber: complaint.ward?.ward_number || '01',
            ticketNumber: complaint.ticket_number,
          });
          uploadToZohoWorkDrive(
            folderId,
            `victory_poster_${complaint.ticket_number}.jpg`,
            buffer,
            'image/jpeg'
          ).catch((zErr) => console.warn('[Zoho Poster Upload Error]:', zErr));
        } catch (postErr) {
          console.error('[Poster Processing Error]:', postErr);
        }
      }

      const { data: approved, error } = await supabaseAdmin
        .from('complaints')
        .update({
          status: 'RESOLVED',
          resolved_at: resolvedAt,
          poster_url: posterUrl,
        })
        .eq('id', ticketId)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Trigger Automated WhatsApp Broadcast (Citizen + Town Group + MLA Group) with the REAL Victory Poster!
      try {
        await broadcastResolutionPoster({
          citizenPhone: complaint.citizen_phone,
          citizenName: complaint.citizen_name,
          ticketNumber: complaint.ticket_number,
          category: complaint.category,
          wardName: complaint.ward?.name || 'Mangalagiri',
          mlaName: complaint.organization?.mla_name || 'Ramesh Darisi',
          posterUrl: posterUrl,
          turnaroundTime: turnaroundStr,
          mlaGroupId: complaint.organization?.whatsapp_group_mla,
          townGroupId: complaint.ward?.whatsapp_group_jid || complaint.organization?.whatsapp_group_town,
        });
      } catch (waErr) {
        console.error('[WhatsApp Broadcast Error]:', waErr);
      }

      return NextResponse.json({ success: true, complaint: approved });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
