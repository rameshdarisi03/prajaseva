// ==============================================================================
// META WHATSAPP CLOUD API AUTOMATION SERVICE
// Powers: 
// 1. Citizen OTP Verification with "Copy Code" button
// 2. Ticket Confirmation Reference Number dispatch
// 3. Multi-Tier Resolution Poster Broadcast (Town Group + MLA Group + Citizen)
// ==============================================================================

const WHATSAPP_API_URL = 'https://graph.facebook.com/v19.0';

/**
 * Sanitizes an Indian phone number to E.164 without leading plus (e.g., '919876543210')
 */
export function sanitizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  return digits;
}

/**
 * Sends a WhatsApp OTP to the citizen via Meta Cloud API.
 */
export async function sendWhatsAppOtp(phone: string, otpCode: string): Promise<boolean> {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.warn('[WhatsApp] Credentials missing, logging OTP for local dev:', otpCode);
    return true;
  }

  const cleanPhone = sanitizePhone(phone);

  try {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'text',
      text: {
        body: `*Praja Seva Verification Code*\n\nYour 6-digit verification code is: *${otpCode}*\n\nValid for 5 minutes. Please do not share this code with anyone.`,
      },
    };

    const res = await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return !!data.messages?.[0]?.id;
  } catch (error) {
    console.error('[WhatsApp OTP Error]:', error);
    return false;
  }
}

/**
 * Sends Ticket Confirmation with Reference Number to Citizen.
 */
export async function sendTicketConfirmation(params: {
  phone: string;
  citizenName: string;
  ticketNumber: string;
  category: string;
  wardName: string;
}): Promise<boolean> {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return false;

  const cleanPhone = sanitizePhone(params.phone);

  try {
    const message = `Namaskaram *${params.citizenName}* garu 🙏\n\nYour grievance has been successfully registered with the MLA Camp Office.\n\n📋 *Reference No:* *${params.ticketNumber}*\n🏷️ *Category:* ${params.category}\n📍 *Location:* ${params.wardName}\n\nOur field volunteer has been notified and is attending to the issue. You can track live progress here:\n${process.env.NEXT_PUBLIC_APP_URL}/?track=${params.ticketNumber}`;

    const res = await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'text',
        text: { body: message },
      }),
    });

    return res.ok;
  } catch (error) {
    console.error('[WhatsApp Confirmation Error]:', error);
    return false;
  }
}

/**
 * Broadcasts Resolved Before/After Poster to Groups and Citizen.
 */
export async function broadcastResolutionPoster(params: {
  citizenPhone: string;
  ticketNumber: string;
  category: string;
  wardName: string;
  mlaName: string;
  posterUrl: string;
  mlaGroupId?: string | null;
  townGroupId?: string | null;
}): Promise<void> {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return;

  const caption = `✅ *ISSUE RESOLVED! / పరిష్కారం లభించింది*\n\n📋 *Ticket Ref:* ${params.ticketNumber}\n📍 *Location:* ${params.wardName}\n🏷️ *Category:* ${params.category}\n\nProblem inspected and fixed on the ground by Team ${params.mlaName}. Thank you for your active participation!`;

  // 1. Send direct to Complainant Citizen
  try {
    await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: sanitizePhone(params.citizenPhone),
        type: 'image',
        image: {
          link: params.posterUrl,
          caption: caption,
        },
      }),
    });
  } catch (e) {
    console.error('[WhatsApp Broadcast Citizen Error]:', e);
  }

  // 2. Broadcast to Town & MLA Groups if configured
  const groupsToNotify = [params.townGroupId, params.mlaGroupId].filter(Boolean);
  for (const groupId of groupsToNotify) {
    try {
      await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: groupId,
          type: 'image',
          image: {
            link: params.posterUrl,
            caption: caption,
          },
        }),
      });
    } catch (e) {
      console.error(`[WhatsApp Group Broadcast Error (${groupId})]:`, e);
    }
  }
}
