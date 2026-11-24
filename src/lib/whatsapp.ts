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
 * Sends a WhatsApp OTP to the citizen via Meta Cloud API using the approved AUTHENTICATION template.
 */
export async function sendWhatsAppOtp(phone: string, otpCode: string): Promise<boolean> {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.warn('[WhatsApp] Credentials missing, cannot send OTP');
    return false;
  }

  const cleanPhone = sanitizePhone(phone);

  try {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'template',
      template: {
        name: 'user_authcode_tenopilot',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: otpCode },
            ],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [
              { type: 'text', text: otpCode },
            ],
          },
        ],
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
    if (data.error) {
      console.error('[WhatsApp Cloud API Error]:', data.error);
      return false;
    }
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
 * Sends Official Onboarding Welcome Message to newly enrolled Admin or Field Volunteer (100% English)
 */
export async function sendStaffOnboardingMessage(params: {
  phone: string;
  fullName: string;
  role: string;
  orgName: string;
  assignedWardsText?: string;
}): Promise<boolean> {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    console.warn('[WhatsApp] Credentials missing, cannot send onboarding message');
    return false;
  }

  const cleanPhone = sanitizePhone(params.phone);
  const isVolunteer = params.role === 'VOLUNTEER';
  const roleTitle = isVolunteer ? 'Field Volunteer' : 'Secretariat Admin';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prajaseva-one.vercel.app';
  const loginUrl = `${appUrl}/login`;
  const cleanMobile = params.phone.replace(/\D/g, '').slice(-10);

  // 1. Try sending via Meta Approved UTILITY template (praja_staff_welcome_v1)
  try {
    const templatePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'template',
      template: {
        name: 'praja_staff_welcome_v1',
        language: { code: 'en_US' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: params.fullName },
              { type: 'text', text: params.orgName },
              { type: 'text', text: roleTitle },
              { type: 'text', text: params.assignedWardsText || 'All Wards (Entire Constituency)' },
              { type: 'text', text: `+91 ${cleanMobile}` },
            ],
          },
        ],
      },
    };

    const templateRes = await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templatePayload),
    });

    const templateData = await templateRes.json();
    if (templateData.messages?.[0]?.id) {
      return true;
    }
  } catch (templateErr) {
    console.warn('[WhatsApp Template Fallback]:', templateErr);
  }

  // 2. Direct English Text Fallback
  const englishMessage =
    `Hello *${params.fullName}*,\n\n` +
    `You have been officially enrolled as a *${roleTitle}* for *${params.orgName}* on the Praja Seva Portal.\n\n` +
    (isVolunteer && params.assignedWardsText ? `📍 *Assigned Area:* ${params.assignedWardsText}\n\n` : '') +
    `🔐 *How to Login:*\n` +
    `1. Open: ${loginUrl}\n` +
    `2. Enter your registered mobile number: *+91 ${cleanMobile}*\n` +
    `3. You will receive a 6-digit WhatsApp OTP to set your private 4-digit security PIN.\n\n` +
    `Once set, your 4-digit PIN will sync across all your devices (phone, laptop, tablet) for fast 1-tap login.\n\n` +
    `_— Praja Seva Operations Desk_`;

  try {
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
        text: { body: englishMessage },
      }),
    });

    const data = await res.json();
    if (data.error) {
      console.warn('[WhatsApp Onboarding Message Error]:', data.error);
      return false;
    }
    return !!data.messages?.[0]?.id;
  } catch (error) {
    console.error('[WhatsApp Onboarding Error]:', error);
    return false;
  }
}

/**
 * Broadcasts Resolved Before/After Poster to Groups and Citizen.
 */
export async function broadcastResolutionPoster(params: {
  citizenPhone: string;
  citizenName?: string;
  ticketNumber: string;
  category: string;
  wardName: string;
  mlaName: string;
  posterUrl: string;
  turnaroundTime?: string;
  mlaGroupId?: string | null;
  townGroupId?: string | null;
}): Promise<void> {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return;

  const cleanPhone = sanitizePhone(params.citizenPhone);
  const caption = `✅ *ISSUE RESOLVED! / పరిష్కారం లభించింది*\n\n📋 *Ticket Ref:* ${params.ticketNumber}\n📍 *Location:* ${params.wardName}\n🏷️ *Category:* ${params.category}\n\nProblem inspected and fixed on the ground by Team ${params.mlaName}. Thank you for your active participation!`;

  // 1. Send to Citizen: Try dedicated Image Header Template first, fallback to standard image message
  try {
    const templatePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'template',
      template: {
        name: 'praja_resolution_poster_v1',
        language: { code: 'en_US' },
        components: [
          {
            type: 'header',
            parameters: [
              {
                type: 'image',
                image: { link: params.posterUrl },
              },
            ],
          },
          {
            type: 'body',
            parameters: [
              { type: 'text', text: params.citizenName || 'Citizen' },
              { type: 'text', text: params.ticketNumber },
              { type: 'text', text: params.category },
              { type: 'text', text: params.wardName },
              { type: 'text', text: params.mlaName },
              { type: 'text', text: params.turnaroundTime || 'Promptly' },
            ],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [
              { type: 'text', text: params.ticketNumber },
            ],
          },
        ],
      },
    };

    const templateRes = await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templatePayload),
    });

    const templateData = await templateRes.json();
    if (!templateRes.ok || templateData.error) {
      console.warn('[WhatsApp Template Fallback to Session Image]:', templateData.error?.message || 'Template not ready');
      // Fallback to direct image message with caption
      await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'image',
          image: {
            link: params.posterUrl,
            caption: caption,
          },
        }),
      });
    }
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
