import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { sendWhatsAppOtp } from '@/lib/whatsapp';
import {
  storeOtp,
  verifyStoredOtp,
  createSignedOtpToken,
  verifySignedOtpToken,
} from '@/lib/otpStore';

interface MembershipRecord {
  staffId: string;
  isFounderRecord: boolean;
  name: string;
  phone: string;
  role: 'ADMIN' | 'VOLUNTEER';
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
  assignedWardId: string | null;
  pinHash: string | null;
  hasPin: boolean;
  pinSignature: string;
  failedPinAttempts: number;
  lockedUntil: string | null;
  isLocked: boolean;
}

async function getMembershipsForPhone(cleanPhone: string): Promise<MembershipRecord[]> {
  const { data: staffRows } = await supabaseAdmin
    .from('staff_whitelist')
    .select('id, full_name, phone, role, is_active, organization_id, assigned_ward_id, failed_pin_attempts, locked_until, pin_hash')
    .or(`phone.eq.${cleanPhone},phone.eq.91${cleanPhone},phone.eq.+91${cleanPhone}`)
    .eq('is_active', true);

  const { data: founderOrgs } = await supabaseAdmin
    .from('organizations')
    .select('id, name, slug, mla_name, founder_phone')
    .or(`founder_phone.eq.${cleanPhone},founder_phone.eq.91${cleanPhone},founder_phone.eq.+91${cleanPhone}`);

  // Fetch organizations referenced by staffRows
  const staffOrgIds = Array.from(
    new Set((staffRows || []).map((s) => s.organization_id).filter(Boolean))
  );

  let orgMap = new Map<string, { id: string; name: string; slug: string; mla_name?: string }>();
  for (const org of founderOrgs || []) {
    orgMap.set(org.id, org);
  }

  const missingOrgIds = staffOrgIds.filter((id) => !orgMap.has(id));
  if (missingOrgIds.length > 0) {
    const { data: extraOrgs } = await supabaseAdmin
      .from('organizations')
      .select('id, name, slug, mla_name')
      .in('id', missingOrgIds);
    for (const org of extraOrgs || []) {
      orgMap.set(org.id, org);
    }
  }

  const membershipsByOrg = new Map<string, MembershipRecord>();

  for (const staff of staffRows || []) {
    const org = orgMap.get(staff.organization_id);
    const pinHash = staff.pin_hash || null;
    const lockedUntil = staff.locked_until || null;
    const isLocked = Boolean(lockedUntil && new Date(lockedUntil).getTime() > Date.now());

    membershipsByOrg.set(staff.organization_id, {
      staffId: staff.id,
      isFounderRecord: false,
      name: staff.full_name,
      phone: cleanPhone,
      role: (staff.role as 'ADMIN' | 'VOLUNTEER') || 'VOLUNTEER',
      organizationId: staff.organization_id,
      organizationSlug: org?.slug || 'org_mangalagiri',
      organizationName: org?.name || 'Constituency Command Center',
      assignedWardId: staff.assigned_ward_id || null,
      pinHash,
      hasPin: Boolean(pinHash),
      pinSignature: pinHash ? pinHash.slice(-16) : 'no_pin',
      failedPinAttempts: staff.failed_pin_attempts || 0,
      lockedUntil,
      isLocked,
    });
  }

  for (const org of founderOrgs || []) {
    if (!membershipsByOrg.has(org.id)) {
      membershipsByOrg.set(org.id, {
        staffId: 'founder-admin',
        isFounderRecord: true,
        name: org.mla_name || org.name || 'Administrator',
        phone: cleanPhone,
        role: 'ADMIN',
        organizationId: org.id,
        organizationSlug: org.slug || 'org_mangalagiri',
        organizationName: org.name || 'Constituency Command Center',
        assignedWardId: null,
        pinHash: null,
        hasPin: false,
        pinSignature: 'no_pin',
        failedPinAttempts: 0,
        lockedUntil: null,
        isLocked: false,
      });
    }
  }

  return Array.from(membershipsByOrg.values());
}

function toClientSession(m: MembershipRecord) {
  return {
    staffId: m.staffId,
    name: m.name,
    phone: m.phone,
    role: m.role,
    organizationId: m.organizationId,
    organizationSlug: m.organizationSlug,
    organizationName: m.organizationName,
    assignedWardId: m.assignedWardId,
    pinSignature: m.pinSignature,
    hasPin: m.hasPin,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { action, phone, pin, newPin, otp, code, pinSignature, organizationId, staffId } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    const rawDigits = String(phone || '').replace(/\D/g, '');
    let cleanPhone = rawDigits;
    if (rawDigits.startsWith('91') && rawDigits.length > 10) {
      cleanPhone = rawDigits.slice(2);
    } else if (rawDigits.startsWith('0') && rawDigits.length > 10) {
      cleanPhone = rawDigits.slice(1);
    }
    cleanPhone = cleanPhone.slice(-10);

    // -------------------------------------------------------------------------
    // 1. ACTION: CHECK PHONE & RETURN PIN / MULTI-ORG STATUS
    // -------------------------------------------------------------------------
    if (action === 'check_phone') {
      const memberships = await getMembershipsForPhone(cleanPhone);

      if (memberships.length === 0) {
        return NextResponse.json({
          exists: false,
          error:
            'Access Restricted: This mobile number is not registered with an authorized constituency office. Please contact your constituency administrator.',
        }, { status: 403 });
      }

      // If enrolled in 2+ organizations, require WhatsApp OTP first before listing orgs
      if (memberships.length > 1) {
        return NextResponse.json({
          success: true,
          exists: true,
          multiOrg: true,
          hasPin: false,
          name: memberships[0].name,
          locked: false,
        });
      }

      const m = memberships[0];
      return NextResponse.json({
        success: true,
        exists: true,
        multiOrg: false,
        hasPin: m.hasPin,
        name: m.name,
        role: m.role,
        organizationId: m.organizationId,
        locked: m.isLocked,
      });
    }

    // -------------------------------------------------------------------------
    // 2. ACTION: SEND WHATSAPP OTP
    // -------------------------------------------------------------------------
    if (action === 'send_otp' || action === 'check_whitelist') {
      const memberships = await getMembershipsForPhone(cleanPhone);

      if (memberships.length === 0) {
        return NextResponse.json({
          whitelisted: false,
          error:
            'Access Restricted: This mobile number is not registered with an authorized constituency office. Please contact your constituency administrator.',
        }, { status: 403 });
      }

      // Generate 6-digit WhatsApp OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      storeOtp(cleanPhone, otpCode, 10 * 60 * 1000);

      // Dispatch via Meta WhatsApp Cloud API
      const sent = await sendWhatsAppOtp(cleanPhone, otpCode);
      if (!sent) {
        return NextResponse.json({
          error: 'Failed to dispatch WhatsApp verification code. Please check your WhatsApp number or try again shortly.',
        }, { status: 502 });
      }

      const first = memberships[0];
      const otpCookieToken = createSignedOtpToken(cleanPhone, otpCode, 10 * 60 * 1000);
      const res = NextResponse.json({
        success: true,
        whitelisted: true,
        otpSent: true,
        multiOrg: memberships.length > 1,
        hasPin: first.hasPin,
        name: first.name,
        role: first.role,
        organizationId: first.organizationId,
        organizationSlug: first.organizationSlug,
        organizationName: first.organizationName,
        message: 'WhatsApp OTP dispatched successfully',
      });
      res.cookies.set('ps_otp_token', otpCookieToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 600,
      });
      return res;
    }

    // -------------------------------------------------------------------------
    // 3. ACTION: VERIFY WHATSAPP OTP (RETURNS ALL ENROLLED ORGANIZATIONS)
    // -------------------------------------------------------------------------
    if (action === 'verify_otp') {
      const inputCode = String(otp || code || '').trim();

      if (!inputCode) {
        return NextResponse.json({ error: '6-digit OTP required' }, { status: 400 });
      }

      const otpCookie = req.cookies.get('ps_otp_token')?.value;
      const cookieResult = otpCookie ? verifySignedOtpToken(otpCookie, cleanPhone, inputCode) : null;
      const otpResult = cookieResult?.valid ? cookieResult : verifyStoredOtp(cleanPhone, inputCode);
      if (!otpResult.valid) {
        return NextResponse.json({ error: cookieResult?.reason || otpResult.reason || 'Invalid verification code' }, { status: 401 });
      }

      // Re-store a short reset token (both in-memory and stateless signed cookie) so set_pin works across Vercel lambdas
      storeOtp(`reset_${cleanPhone}`, 'VERIFIED', 5 * 60 * 1000);
      const resetCookieToken = createSignedOtpToken(`reset_${cleanPhone}`, 'VERIFIED', 5 * 60 * 1000);

      const memberships = await getMembershipsForPhone(cleanPhone);
      if (memberships.length === 0) {
        return NextResponse.json({ error: 'Account access not found' }, { status: 403 });
      }

      const sessions = memberships.map(toClientSession);

      const res = NextResponse.json({
        success: true,
        multiOrg: sessions.length > 1,
        hasPin: sessions[0].hasPin,
        session: sessions[0],
        sessions,
      });
      res.cookies.delete('ps_otp_token');
      res.cookies.set('ps_reset_token', resetCookieToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 300,
      });
      return res;
    }

    // -------------------------------------------------------------------------
    // 4. ACTION: VERIFY 4-DIGIT PIN (FAST 1-STEP DAILY LOGIN)
    // -------------------------------------------------------------------------
    if (action === 'verify_pin') {
      if (!pin || String(pin).length !== 4) {
        return NextResponse.json({ error: '4-digit PIN required' }, { status: 400 });
      }

      const memberships = await getMembershipsForPhone(cleanPhone);
      if (memberships.length === 0) {
        return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
      }

      const m = organizationId
        ? memberships.find((item) => item.organizationId === organizationId) || memberships[0]
        : memberships[0];

      if (m.isLocked) {
        return NextResponse.json({
          error: 'Account temporarily locked due to repeated incorrect PIN attempts. Use "Forgot PIN?" to reset via WhatsApp OTP.',
        }, { status: 423 });
      }

      if (!m.pinHash) {
        return NextResponse.json({
          error: 'No PIN configured yet. Please log in using WhatsApp OTP to create your PIN.',
          needsSetup: true,
        }, { status: 400 });
      }

      const isValidPin = await bcrypt.compare(String(pin), m.pinHash);

      if (!isValidPin) {
        const attempts = m.failedPinAttempts + 1;
        const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
        if (!m.isFounderRecord) {
          await supabaseAdmin
            .from('staff_whitelist')
            .update({ failed_pin_attempts: attempts, locked_until: lockedUntil })
            .eq('id', m.staffId);
        }

        if (attempts >= 5) {
          return NextResponse.json({
            error: 'Account locked for 15 minutes due to 5 incorrect attempts. Click "Forgot PIN?" to reset via WhatsApp OTP.',
          }, { status: 423 });
        }

        const remaining = 5 - attempts;
        return NextResponse.json({
          error: `Incorrect 4-digit PIN. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before temporary lock.`,
        }, { status: 401 });
      }

      if (!m.isFounderRecord) {
        await supabaseAdmin
          .from('staff_whitelist')
          .update({ failed_pin_attempts: 0, locked_until: null })
          .eq('id', m.staffId);
      }

      return NextResponse.json({
        success: true,
        session: toClientSession(m),
      });
    }

    // -------------------------------------------------------------------------
    // 5. ACTION: SET OR RESET 4-DIGIT PIN (SCOPED TO SELECTED ORGANIZATION)
    // -------------------------------------------------------------------------
    if (action === 'set_pin' || action === 'reset_pin') {
      const pinToSet = String(newPin || pin || '').trim();

      if (!pinToSet || pinToSet.length !== 4 || !/^\d{4}$/.test(pinToSet)) {
        return NextResponse.json({ error: 'PIN must be exactly 4 digits (0-9)' }, { status: 400 });
      }

      const resetCookie = req.cookies.get('ps_reset_token')?.value;
      const otpCookie = req.cookies.get('ps_otp_token')?.value;
      const resetCookieAuth = resetCookie ? verifySignedOtpToken(resetCookie, `reset_${cleanPhone}`, 'VERIFIED') : null;
      const directCookieAuth = otp && otpCookie ? verifySignedOtpToken(otpCookie, cleanPhone, String(otp).trim()) : null;

      const resetAuth = resetCookieAuth?.valid ? resetCookieAuth : verifyStoredOtp(`reset_${cleanPhone}`, 'VERIFIED');
      const directOtpAuth = directCookieAuth?.valid
        ? directCookieAuth
        : otp
        ? verifyStoredOtp(cleanPhone, String(otp).trim())
        : null;

      if (!resetAuth.valid && (!directOtpAuth || !directOtpAuth.valid)) {
        return NextResponse.json({
          error: 'Verification session expired. Please verify with WhatsApp OTP again.',
        }, { status: 401 });
      }

      const memberships = await getMembershipsForPhone(cleanPhone);
      if (memberships.length === 0) {
        return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
      }

      const targetMembership = organizationId
        ? memberships.find((item) => item.organizationId === organizationId) || memberships[0]
        : memberships[0];

      const hashedPin = await bcrypt.hash(pinToSet, 10);

      if (targetMembership.isFounderRecord) {
        // Ensure founder has a staff_whitelist row in this organization so PIN persists
        await supabaseAdmin
          .from('staff_whitelist')
          .upsert(
            {
              organization_id: targetMembership.organizationId,
              full_name: targetMembership.name,
              phone: cleanPhone,
              role: 'ADMIN',
              pin_hash: hashedPin,
              is_active: true,
              failed_pin_attempts: 0,
              locked_until: null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'organization_id,phone' }
          );
      } else {
        const { error: updateErr } = await supabaseAdmin
          .from('staff_whitelist')
          .update({
            pin_hash: hashedPin,
            failed_pin_attempts: 0,
            locked_until: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetMembership.staffId);

        if (updateErr) {
          return NextResponse.json({ error: 'Failed to save security PIN to database' }, { status: 500 });
        }
      }

      const updatedMemberships = await getMembershipsForPhone(cleanPhone);
      const updated =
        updatedMemberships.find((item) => item.organizationId === targetMembership.organizationId) ||
        targetMembership;

      const res = NextResponse.json({
        success: true,
        pinUpdated: true,
        message: 'Security PIN set successfully for this organization!',
        session: toClientSession({
          ...updated,
          hasPin: true,
          pinSignature: hashedPin.slice(-16),
        }),
      });
      res.cookies.delete('ps_reset_token');
      res.cookies.delete('ps_otp_token');
      return res;
    }

    // -------------------------------------------------------------------------
    // 6. ACTION: VALIDATE ACTIVE SESSION (PER-ORG CROSS-DEVICE CHECK)
    // -------------------------------------------------------------------------
    if (action === 'validate_session') {
      const memberships = await getMembershipsForPhone(cleanPhone);

      const matched = organizationId
        ? memberships.find((item) => item.organizationId === organizationId)
        : staffId && staffId !== 'founder-admin'
        ? memberships.find((item) => item.staffId === staffId)
        : memberships[0];

      if (!matched) {
        return NextResponse.json({
          valid: false,
          reason: 'ACCOUNT_NOT_FOUND',
          error: 'Your account access has been revoked.',
        }, { status: 401 });
      }

      const currentSignature = matched.pinSignature;
      if (pinSignature && pinSignature !== 'no_pin' && currentSignature !== 'no_pin' && pinSignature !== currentSignature) {
        return NextResponse.json({
          valid: false,
          reason: 'PIN_CHANGED_ELSEWHERE',
          error: 'Security Alert: Your security PIN was updated on another device. Please log in with your new PIN.',
        }, { status: 401 });
      }

      return NextResponse.json({
        valid: true,
        currentSignature,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
