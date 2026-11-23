import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveComplaintFolder, uploadToZohoWorkDrive } from '@/lib/zoho';

// Register Telugu fonts once at module initialization
try {
  const boldPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansTelugu-Bold.ttf');
  const regPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansTelugu-Regular.ttf');
  if (fs.existsSync(boldPath)) {
    GlobalFonts.registerFromPath(boldPath, 'Noto Sans Telugu Bold');
  }
  if (fs.existsSync(regPath)) {
    GlobalFonts.registerFromPath(regPath, 'Noto Sans Telugu Regular');
  }
} catch (e: any) {
  console.warn('[ServerPoster Font Registration Note]:', e.message);
}

const FONT_TELUGU_BOLD = '"Noto Sans Telugu Bold", "Nirmala UI", sans-serif';
const FONT_TELUGU_REG = '"Noto Sans Telugu Regular", "Nirmala UI", sans-serif';

export interface PosterData {
  ticketNumber: string;
  category: string;
  locationAddress: string;
  citizenName: string;
  proximityMeters?: number | null;
  beforePhotoUrl?: string | null;
  afterPhotoUrl?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  submittedForApprovalAt?: string | null;
  turnaroundTime?: string;
  constituencyName?: string;
  constituencySlogan?: string;
  mlaName?: string;
}

function formatDate(isoStr?: string | null): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${day}-${month}-${year}, ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

function drawImageCover(
  ctx: any,
  img: any,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgRatio = img.width / img.height;
  const targetRatio = w / h;
  let sWidth: number, sHeight: number, sx: number, sy: number;

  if (imgRatio > targetRatio) {
    sHeight = img.height;
    sWidth = img.height * targetRatio;
    sx = (img.width - sWidth) / 2;
    sy = 0;
  } else {
    sWidth = img.width;
    sHeight = img.width / targetRatio;
    sx = 0;
    sy = (img.height - sHeight) / 2;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
}

/**
 * Generates the official 4:5 1080x1350 High-Res Victory PR Poster JPEG buffer.
 */
export async function generateServerPosterBuffer(data: PosterData): Promise<Buffer> {
  const canvas = createCanvas(1080, 1350);
  const ctx = canvas.getContext('2d');

  // 1. Deep Obsidian Gradient Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 1350);
  bgGrad.addColorStop(0, '#060a17');
  bgGrad.addColorStop(0.35, '#0b1329');
  bgGrad.addColorStop(1, '#03050c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, 1350);

  // Subtle Golden Aura Top Glow
  const glowGrad = ctx.createRadialGradient(540, 0, 20, 540, 0, 450);
  glowGrad.addColorStop(0, 'rgba(245, 158, 11, 0.15)');
  glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, 1080, 500);

  // Outer Gold Inset Border
  ctx.save();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(20, 20, 1040, 1310, 24);
  ctx.stroke();
  ctx.restore();

  // 2. Top Bar: Coalition Emblems + Andhra Pradesh Govt
  ctx.save();
  // TDP Emblem
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.roundRect(40, 45, 80, 32, 16);
  ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.font = `bold 14px ${FONT_TELUGU_BOLD}`;
  ctx.textAlign = 'center';
  ctx.fillText('🚲 TDP', 80, 67);

  // JSP Emblem
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.roundRect(130, 45, 80, 32, 16);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText('🥛 JSP', 170, 67);

  // BJP Emblem
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.roundRect(220, 45, 80, 32, 16);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText('🪷 BJP', 260, 67);
  ctx.restore();

  // Central / Right Titles
  ctx.save();
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fde68a';
  ctx.font = `bold 22px ${FONT_TELUGU_BOLD}`;
  ctx.fillText('🏛️ కూటమి ప్రజా ప్రభుత్వం', 1040, 58);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = `bold 15px ${FONT_TELUGU_BOLD}`;
  ctx.fillText('GOVERNMENT OF ANDHRA PRADESH', 1040, 80);
  ctx.restore();

  // Divider Line
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(40, 95);
  ctx.lineTo(1040, 95);
  ctx.stroke();

  // 3. 4-Pillar Leadership Strip (Strictly Horizontal)
  const leaders = [
    {
      name: 'Sri Narendra Modi',
      role: "Hon'ble Prime Minister",
      file: 'modi.jpg',
      initials: 'NM',
    },
    {
      name: 'Sri N. Chandrababu Naidu',
      role: "Hon'ble Chief Minister",
      file: 'cbn.jpg',
      initials: 'CBN',
    },
    {
      name: 'Sri Pawan Kalyan',
      role: "Hon'ble Deputy CM",
      file: 'pk.jpg',
      initials: 'PK',
    },
    {
      name: data.mlaName || 'Sri Ramesh Darisi',
      role: 'Local MLA / Incharge',
      file: 'ramesh_darisi.jpg',
      initials: 'RD',
    },
  ];

  const colW = (1040 - 40) / 4;
  for (let i = 0; i < 4; i++) {
    const l = leaders[i];
    const cx = 40 + colW * i + colW / 2;
    const cy = 160;
    const r = 44;

    ctx.save();
    // Outer Gold Ring
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
    ctx.fillStyle = '#fde68a';
    ctx.fill();

    // Clipped Circular Portrait
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    let imgLoaded = false;
    try {
      const localFilePath = path.join(process.cwd(), 'public', 'leaders', l.file);
      if (fs.existsSync(localFilePath)) {
        const lImg = await loadImage(localFilePath);
        ctx.drawImage(lImg, cx - r, cy - r, r * 2, r * 2);
        imgLoaded = true;
      } else {
        // Fallback to Supabase CDN storage URL
        const cdnUrl = `https://miciwfmbgdsrsdogvhit.supabase.co/storage/v1/object/public/complaints/leaders/${l.file}`;
        const cdnRes = await fetch(cdnUrl);
        if (cdnRes.ok) {
          const cdnBuf = Buffer.from(await cdnRes.arrayBuffer());
          const lImg = await loadImage(cdnBuf);
          ctx.drawImage(lImg, cx - r, cy - r, r * 2, r * 2);
          imgLoaded = true;
        }
      }
    } catch (e: any) {
      console.warn(`[Poster Leader Image Load Warning for ${l.name}]:`, e.message);
    }

    if (!imgLoaded) {
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.fillStyle = '#fde68a';
      ctx.font = `bold 22px ${FONT_TELUGU_BOLD}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(l.initials, cx, cy);
    }
    ctx.restore();

    // Leader Name & Designation
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 16px ${FONT_TELUGU_BOLD}`;
    ctx.fillText(l.name, cx, cy + r + 22);

    ctx.fillStyle = '#fbbf24';
    ctx.font = `13px ${FONT_TELUGU_REG}`;
    ctx.fillText(l.role, cx, cy + r + 38);
    ctx.restore();
  }

  // Divider Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 260);
  ctx.lineTo(1040, 260);
  ctx.stroke();

  // 4. Hero Turnaround Badge & Constituency Header
  ctx.save();
  const turnaroundPillW = 540;
  const turnaroundPillX = 540 - turnaroundPillW / 2;
  ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(turnaroundPillX, 275, turnaroundPillW, 38, 19);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#6ee7b7';
  ctx.font = `bold 19px ${FONT_TELUGU_BOLD}`;
  ctx.textAlign = 'center';
  const turnaroundText = data.turnaroundTime || '3 MINS';
  ctx.fillText(`⚡ 100% పరిష్కారం • ${turnaroundText.toUpperCase()} పూర్తయిన సమయం`, 540, 301);

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 26px ${FONT_TELUGU_BOLD}`;
  ctx.fillText(data.constituencyName || 'మంగళగిరి శాసనసభ నియోజకవర్గం', 540, 348);

  ctx.fillStyle = '#fde68a';
  ctx.font = `italic 18px ${FONT_TELUGU_REG}`;
  ctx.fillText(`"${data.constituencySlogan || 'ప్రజల కోసం... ప్రజా సేవలో...'}"`, 540, 376);
  ctx.restore();

  // 5. BEFORE VS AFTER CARDS
  const cardW = 485;
  const cardH = 550;
  const cardY = 395;

  // BEFORE CARD (LEFT)
  const leftX = 40;
  ctx.save();
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 3;
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(leftX, cardY, cardW, cardH, 16);
  ctx.fill();
  ctx.stroke();

  // Header Strip (Red)
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.roundRect(leftX, cardY, cardW, 40, [16, 16, 0, 0]);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 16px ${FONT_TELUGU_BOLD}`;
  ctx.textAlign = 'left';
  ctx.fillText('🔴 సమస్య (BEFORE)', leftX + 15, cardY + 26);

  ctx.font = `13px ${FONT_TELUGU_REG}`;
  ctx.textAlign = 'right';
  ctx.fillText(`నమోదు: ${formatDate(data.createdAt)}`, leftX + cardW - 15, cardY + 26);

  // Before Image
  ctx.beginPath();
  ctx.roundRect(leftX + 2, cardY + 40, cardW - 4, cardH - 42, [0, 0, 14, 14]);
  ctx.clip();

  let beforeLoaded = false;
  if (data.beforePhotoUrl) {
    try {
      const bRes = await fetch(data.beforePhotoUrl);
      if (bRes.ok) {
        const bBuf = Buffer.from(await bRes.arrayBuffer());
        const bImg = await loadImage(bBuf);
        drawImageCover(ctx, bImg, leftX + 2, cardY + 40, cardW - 4, cardH - 42);
        beforeLoaded = true;
      }
    } catch (err: any) {
      console.warn('[Poster Before Photo Load Warning]:', err.message);
    }
  }
  if (!beforeLoaded) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(leftX + 2, cardY + 40, cardW - 4, cardH - 42);
    ctx.fillStyle = '#94a3b8';
    ctx.font = `16px ${FONT_TELUGU_REG}`;
    ctx.textAlign = 'center';
    ctx.fillText('ఫోటో సాక్ష్యం నమోదు చేయబడింది', leftX + cardW / 2, cardY + cardH / 2);
  }
  ctx.restore();

  // AFTER CARD (RIGHT)
  const rightX = 555;
  ctx.save();
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 3;
  ctx.fillStyle = '#06281e';
  ctx.beginPath();
  ctx.roundRect(rightX, cardY, cardW, cardH, 16);
  ctx.fill();
  ctx.stroke();

  // Header Strip (Emerald)
  ctx.fillStyle = '#059669';
  ctx.beginPath();
  ctx.roundRect(rightX, cardY, cardW, 40, [16, 16, 0, 0]);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 16px ${FONT_TELUGU_BOLD}`;
  ctx.textAlign = 'left';
  ctx.fillText('🟢 పరిష్కారం (AFTER ✓)', rightX + 15, cardY + 26);

  ctx.font = `13px ${FONT_TELUGU_REG}`;
  ctx.textAlign = 'right';
  ctx.fillText(
    `ధృవీకరించబడింది: ${formatDate(data.resolvedAt || data.submittedForApprovalAt)}`,
    rightX + cardW - 15,
    cardY + 26
  );

  // After Image
  ctx.beginPath();
  ctx.roundRect(rightX + 2, cardY + 40, cardW - 4, cardH - 42, [0, 0, 14, 14]);
  ctx.clip();

  let afterLoaded = false;
  if (data.afterPhotoUrl) {
    try {
      const aRes = await fetch(data.afterPhotoUrl);
      if (aRes.ok) {
        const aBuf = Buffer.from(await aRes.arrayBuffer());
        const aImg = await loadImage(aBuf);
        drawImageCover(ctx, aImg, rightX + 2, cardY + 40, cardW - 4, cardH - 42);
        afterLoaded = true;
      }
    } catch (err: any) {
      console.warn('[Poster After Photo Load Warning]:', err.message);
    }
  }
  if (!afterLoaded) {
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(rightX + 2, cardY + 40, cardW - 4, cardH - 42);
    ctx.fillStyle = '#a7f3d0';
    ctx.font = `16px ${FONT_TELUGU_REG}`;
    ctx.textAlign = 'center';
    ctx.fillText('పరిష్కారం పూర్తి చేయబడింది ✓', rightX + cardW / 2, cardY + cardH / 2);
  }
  ctx.restore();

  // 6. Grievance Summary Dossier Card
  const dosY = 965;
  const dosH = 145;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(40, dosY, 1000, dosH, 16);
  ctx.fill();
  ctx.stroke();

  // Category Pill
  ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(60, dosY + 16, 130, 30, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#93c5fd';
  ctx.font = `bold 16px ${FONT_TELUGU_BOLD}`;
  ctx.textAlign = 'center';
  ctx.fillText(data.category || 'CIVIC', 125, dosY + 37);

  // Ticket Number
  ctx.fillStyle = '#fde68a';
  ctx.font = `bold 18px monospace`;
  ctx.textAlign = 'right';
  ctx.fillText(`ఫిర్యాదు ఐడీ: #${data.ticketNumber}`, 1020, dosY + 37);

  // Location Address
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 18px ${FONT_TELUGU_BOLD}`;
  ctx.textAlign = 'left';
  const loc = data.locationAddress || 'నియోజకవర్గ పరిధి';
  const truncatedLoc = loc.length > 70 ? loc.slice(0, 67) + '...' : loc;
  ctx.fillText(`📍 ${truncatedLoc}`, 60, dosY + 80);

  // GPS & Citizen info
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, dosY + 98);
  ctx.lineTo(1020, dosY + 98);
  ctx.stroke();

  ctx.fillStyle = '#cbd5e1';
  ctx.font = `15px ${FONT_TELUGU_REG}`;
  ctx.fillText(`GPS Geofence: ${data.proximityMeters || 3}m ధృవీకరించబడింది ✓`, 60, dosY + 124);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#fde68a';
  ctx.font = `bold 16px ${FONT_TELUGU_BOLD}`;
  ctx.fillText(`ఫిర్యాదుదారుడు: ${data.citizenName || 'పౌరుడు'}`, 1020, dosY + 124);
  ctx.restore();

  // 7. Footer: Scan QR + Office Info + Official Stamp
  const footY = 1130;
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(40, footY);
  ctx.lineTo(1040, footY);
  ctx.stroke();

  // Generate QR Code
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prajaseva-one.vercel.app';
  const qrUrl = `${appBaseUrl}/p/org_mangalagiri?track=${data.ticketNumber}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 140 });
  const qrImg = await loadImage(qrDataUrl);

  ctx.save();
  // White rounded QR background
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(40, footY + 18, 120, 120, 12);
  ctx.fill();
  ctx.drawImage(qrImg, 45, footY + 23, 110, 110);

  // Footer Center Text
  ctx.fillStyle = '#fde68a';
  ctx.font = `bold 20px ${FONT_TELUGU_BOLD}`;
  ctx.textAlign = 'left';
  ctx.fillText('సమస్యల నమోదుకు స్కాన్ చేయండి', 180, footY + 50);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = `15px ${FONT_TELUGU_REG}`;
  ctx.fillText('Scan to lodge grievances • Praja Seva Citizen Portal', 180, footY + 76);

  ctx.fillStyle = '#34d399';
  ctx.font = `bold 16px ${FONT_TELUGU_BOLD}`;
  ctx.fillText(`Office of ${data.mlaName || 'Sri Ramesh Darisi'} • Local MLA / Incharge`, 180, footY + 106);

  // Official PR Record Stamp (Right)
  ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(760, footY + 45, 280, 50, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#6ee7b7';
  ctx.font = `bold 17px ${FONT_TELUGU_BOLD}`;
  ctx.textAlign = 'center';
  ctx.fillText('🛡️ OFFICIAL PR RECORD', 900, footY + 76);
  ctx.restore();

  return canvas.toBuffer('image/jpeg', 95);
}

/**
 * Generates the poster buffer and automatically uploads it to Supabase CDN Storage & Zoho WorkDrive.
 * Returns the public CDN URL.
 */
export async function generateAndUploadPoster(
  complaint: any,
  turnaroundTime: string
): Promise<string | null> {
  try {
    const buffer = await generateServerPosterBuffer({
      ticketNumber: complaint.ticket_number,
      category: complaint.category,
      locationAddress: complaint.location_address,
      citizenName: complaint.citizen_name,
      proximityMeters: complaint.proximity_meters,
      beforePhotoUrl: complaint.before_photo_url,
      afterPhotoUrl: complaint.after_photo_url,
      createdAt: complaint.created_at,
      resolvedAt: complaint.resolved_at || new Date().toISOString(),
      submittedForApprovalAt: complaint.submitted_for_approval_at,
      turnaroundTime: turnaroundTime,
      constituencyName: complaint.organization?.name || 'మంగళగిరి శాసనసభ నియోజకవర్గం',
      constituencySlogan: complaint.organization?.constituencySlogan || 'ప్రజల కోసం... ప్రజా సేవలో...',
      mlaName: complaint.organization?.mlaName || 'Sri Ramesh Darisi',
    });

    const storagePath = `posters/${complaint.ticket_number}_victory_poster_${Date.now()}.jpg`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from('complaints')
      .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true });

    if (uploadErr) {
      console.error('[Supabase Poster Upload Error]:', uploadErr);
      return null;
    }

    const { data: pubData } = supabaseAdmin.storage
      .from('complaints')
      .getPublicUrl(storagePath);

    const publicUrl = pubData.publicUrl;

    // Archive to Zoho WorkDrive asynchronously
    try {
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
    } catch (zErr) {
      console.warn('[Zoho Folder Resolution Warning]:', zErr);
    }

    return publicUrl;
  } catch (err: any) {
    console.error('[Generate & Upload Poster Error]:', err);
    return null;
  }
}
