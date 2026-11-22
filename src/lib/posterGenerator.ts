// ==============================================================================
// VIRAL PR POSTER GENERATOR ENGINE
// Renders 4:5 Portrait (1080x1350px) Before/After Branded Infographic
// ==============================================================================

export interface PosterData {
  ticketNumber: string;
  categoryName: string;
  wardName: string;
  beforePhotoUrl: string;
  afterPhotoUrl: string;
  mlaName: string;
  mlaDesignation: string;
  mlaPhotoUrl?: string | null;
  partyLogoUrl?: string | null;
  constituencySlogan: string;
  resolutionTimeStr: string;
  dateStr: string;
}

/**
 * Creates an image element and loads a source URL safely.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Create fallback colored image if load fails
      const fallback = new Image();
      resolve(fallback);
    };
    img.src = src;
  });
}

/**
 * Generates the 1080x1350 Before/After PR Poster on an HTML5 canvas.
 * Returns Base64 JPEG data URL and Blob.
 */
export async function generateResolutionPoster(
  data: PosterData
): Promise<{ dataUrl: string; blob: Blob }> {
  const width = 1080;
  const height = 1350;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // 1. Background Fill (Clean Slate / Premium Navy Gradient)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#0F172A'); // Slate 900
  bgGrad.addColorStop(0.85, '#1E293B'); // Slate 800
  bgGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Top Header Banner: "PROBLEM SOLVED"
  const headerGrad = ctx.createLinearGradient(0, 0, width, 0);
  headerGrad.addColorStop(0, '#16A34A'); // Emerald 600
  headerGrad.addColorStop(1, '#059669'); // Emerald 700
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, width, 140);

  // Top Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✅ సమస్య పరిష్కారమైంది / PROBLEM SOLVED', width / 2, 70);

  // Top Sub-banner (Ref # and Ward)
  ctx.font = 'bold 26px sans-serif';
  ctx.fillStyle = '#FEF08A'; // Yellow accent
  ctx.fillText(`గ్రీవెన్స్ రిఫరెన్స్: ${data.ticketNumber} • ${data.wardName}`, width / 2, 115);

  // 3. Before & After Images (Side-by-Side Container)
  const imgY = 170;
  const imgW = 490;
  const imgH = 680;

  // Load photos
  const [beforeImg, afterImg] = await Promise.all([
    loadImage(data.beforePhotoUrl),
    loadImage(data.afterPhotoUrl),
  ]);

  // --- Draw Before Card ---
  const beforeX = 35;
  ctx.save();
  ctx.fillStyle = '#000000';
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 15;
  ctx.fillRect(beforeX, imgY, imgW, imgH);
  ctx.restore();

  if (beforeImg.width) {
    ctx.drawImage(beforeImg, beforeX, imgY, imgW, imgH);
  } else {
    ctx.fillStyle = '#334155';
    ctx.fillRect(beforeX, imgY, imgW, imgH);
  }

  // Before Badge
  ctx.fillStyle = '#DC2626'; // Red 600
  ctx.fillRect(beforeX + 20, imgY + 20, 240, 50);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🔴 ముందు (BEFORE)', beforeX + 140, imgY + 54);

  // --- Draw After Card ---
  const afterX = 555;
  ctx.save();
  ctx.fillStyle = '#000000';
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 15;
  ctx.fillRect(afterX, imgY, imgW, imgH);
  ctx.restore();

  if (afterImg.width) {
    ctx.drawImage(afterImg, afterX, imgY, imgW, imgH);
  } else {
    ctx.fillStyle = '#334155';
    ctx.fillRect(afterX, imgY, imgW, imgH);
  }

  // After Badge
  ctx.fillStyle = '#16A34A'; // Green 600
  ctx.fillRect(afterX + 20, imgY + 20, 240, 50);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🟢 తర్వాత (AFTER)', afterX + 140, imgY + 54);

  // 4. Middle Turnaround KPI Ribbon
  const ribbonY = 880;
  ctx.fillStyle = '#F59E0B'; // Amber 500
  ctx.fillRect(35, ribbonY, 1010, 80);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    `⚡ పరిష్కార వ్యవధి: ${data.resolutionTimeStr} • తేది: ${data.dateStr}`,
    width / 2,
    ribbonY + 50
  );

  // 5. Bottom Politician & Camp Office Footer
  const footerY = 980;
  const footerH = 370;

  // Footer card container
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(35, footerY, 1010, footerH - 35);

  // Left side: MLA Portrait Avatar (or stylized placeholder)
  const avatarSize = 250;
  const avatarX = 70;
  const avatarY = footerY + 40;

  if (data.mlaPhotoUrl) {
    try {
      const mlaImg = await loadImage(data.mlaPhotoUrl);
      ctx.drawImage(mlaImg, avatarX, avatarY, avatarSize, avatarSize);
    } catch {
      // fallback
    }
  } else {
    // Elegant monogram circle
    ctx.fillStyle = '#3B82F6';
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 80px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MLA', avatarX + avatarSize / 2, avatarY + avatarSize / 2 + 30);
  }

  // Right side: Politician details
  const textX = avatarX + avatarSize + 50;
  ctx.textAlign = 'left';

  // MLA Name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText(data.mlaName, textX, footerY + 100);

  // Designation
  ctx.fillStyle = '#94A3B8';
  ctx.font = '28px sans-serif';
  ctx.fillText(data.mlaDesignation, textX, footerY + 150);

  // Slogan
  ctx.fillStyle = '#FBBF24';
  ctx.font = 'italic bold 30px sans-serif';
  ctx.fillText(`"${data.constituencySlogan}"`, textX, footerY + 210);

  // Office Seal watermark
  ctx.fillStyle = '#64748B';
  ctx.font = '22px sans-serif';
  ctx.fillText('ప్రజా సేవా విభాగం • MLA CAMP OFFICE OFFICIAL REDRESSAL', textX, footerY + 260);

  // Export Data URL and Blob
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.92)
  );

  return { dataUrl, blob };
}
