import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { sendWhatsAppOtp } from '@/lib/whatsapp';
import { storeOtp, verifyStoredOtp } from '@/lib/otpStore';

export async function POST(req: NextRequest) {
  try {
    const { action, phone, pin, newPin, otp, code } = await req.json();

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
    // 1. ACTION: CHECK PHONE & RETURN PIN STATUS
    // -------------------------------------------------------------------------
    if (action === 'check_phone') {
      const { data: staff } = await supabaseAdmin
        .from('staff_whitelist')
        .select('id, full_name, role, is_active, organization_id, failed_pin_attempts, locked_until, pin_hash')
        .or(`phone.eq.${cleanPhone},phone.eq.91${cleanPhone},phone.eq.+91${cleanPhone}`)
        .eq('is_active', true)
        .maybeSingle();

      const { data: orgFounder } = await supabaseAdmin
        .from('organizations')
        .select('id, name, slug, founder_phone')
        .or(`founder_phone.eq.${cleanPhone},founder_phone.eq.91${cleanPhone},founder_phone.eq.+91${cleanPhone}`)
        .maybeSingle();

      if (!staff && !orgFounder) {
        return NextResponse.json({
          exists: false,
          error:
            'Access Restricted: This mobile number is not registered with an authorized constituency office. Please contact your constituency administrator.',
        }, { status: 403 });
      }

      const isLocked = staff?.locked_until && new Date(staff.locked_until).getTime() > Date.now();

      return NextResponse.json({
        success: true,
        exists: true,
        hasPin: Boolean(staff?.pin_hash),
        name: staff?.full_name || orgFounder?.name || 'Administrator',
        role: staff?.role || 'ADMIN',
        locked: Boolean(isLocked),
      });
    }

    // -------------------------------------------------------------------------
    // 2. ACTION: SEND WHATSAPP OTP
    // -------------------------------------------------------------------------
    if (action === 'send_otp' || action === 'check_whitelist') {
      const { data: staff } = await supabaseAdmin
        .from('staff_whitelist')
        .select('id, full_name, role, is_active, organization_id, failed_pin_attempts, locked_until, pin_hash')
        .or(`phone.eq.${cleanPhone},phone.eq.91${cleanPhone},phone.eq.+91${cleanPhone}`)
        .eq('is_active', true)
        .maybeSingle();

      const { data: orgFounder } = await supabaseAdmin
        .from('organizations')
        .select('id, name, slug, founder_phone')
        .or(`founder_phone.eq.${cleanPhone},founder_phone.eq.91${cleanPhone},founder_phone.eq.+91${cleanPhone}`)
        .maybeSingle();

      if (!staff && !orgFounder) {
        return NextResponse.json({
          whitelisted: false,
          error:
            'Access Restricted: This mobile number is not registered with an authorized constituency office. Please contact your constituency administrator.',
        }, { status: 403 });
      }

      // Resolve organization info
      const orgId = staff?.organization_id || orgFounder?.id;
      let orgSlug = orgFounder?.slug || 'org_mangalagiri';
      let orgName = orgFounder?.name || 'Constituency Command Center';

      if (staff?.organization_id && !orgFounder) {
        const { data: orgRecord } = await supabaseAdmin
          .from('organizations')
          .select('id, name, slug')
          .eq('id', staff.organization_id)
          .maybeSingle();
        if (orgRecord) {
          orgSlug = orgRecord.slug || 'org_mangalagiri';
          orgName = orgRecord.name || orgName;
        }
      }

      // Generate 6-digit WhatsApp OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      storeOtp(cleanPhone, otpCode, 10 * 60 * 1000);

      // Dispatch via Meta WhatsApp Cloud API
      await sendWhatsAppOtp(cleanPhone, otpCode);

      return NextResponse.json({
        success: true,
        whitelisted: true,
        otpSent: true,
        hasPin: Boolean(staff?.pin_hash),
        name: staff?.full_name || 'Constituency Administrator',
        role: staff?.role || 'ADMIN',
        organizationId: orgId,
        organizationSlug: orgSlug,
        organizationName: orgName,
        message: 'WhatsApp OTP dispatched successfully',
      });
    }

    // -------------------------------------------------------------------------
    // 3. ACTION: VERIFY WHATSAPP OTP
    // -------------------------------------------------------------------------
    if (action === 'verify_otp') {
      const inputCode = String(otp || code || '').trim();

      if (!inputCode) {
        return NextResponse.json({ error: '6-digit OTP required' }, { status: 400 });
      }

      const otpResult = verifyStoredOtp(cleanPhone, inputCode);
      if (!otpResult.valid) {
        return NextResponse.json({ error: otpResult.reason || 'Invalid verification code' }, { status: 401 });
      }

      // Re-store a short reset token in memory so set_pin can be authenticated
      storeOtp(`reset_${cleanPhone}`, 'VERIFIED', 5 * 60 * 1000);

      // Fetch user profile
      const { data: staff } = await supabaseAdmin
        .from('staff_whitelist')
        .select('*')
        .or(`phone.eq.${cleanPhone},phone.eq.91${cleanPhone},phone.eq.+91${cleanPhone}`)
        .maybeSingle();

      const { data: orgFounder } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .or(`founder_phone.eq.${cleanPhone},founder_phone.eq.91${cleanPhone},founder_phone.eq.+91${cleanPhone}`)
        .maybeSingle();

      let orgRecord = orgFounder;
      if (!orgRecord && staff?.organization_id) {
        const { data: org } = await supabaseAdmin
          .from('organizations')
          .select('*')
          .eq('id', staff.organization_id)
          .maybeSingle();
        orgRecord = org;
      }

      const orgSlug = orgRecord?.slug || 'org_mangalagiri';

      return NextResponse.json({
        success: true,
        hasPin: Boolean(staff?.pin_hash),
        session: {
          staffId: staff?.id || 'founder-admin',
          name: staff?.full_name || orgRecord?.mla_name || 'Ramesh Darisi',
          phone: cleanPhone,
          role: staff?.role || 'ADMIN',
          organizationId: staff?.organization_id || orgRecord?.id || '00000000-0000-0000-0000-000000000001',
          organizationSlug: orgSlug,
          organizationName: orgRecord?.name || 'Mangalagiri Assembly',
          assignedWardId: staff?.assigned_ward_id || null,
        },
      });
    }

    // -------------------------------------------------------------------------
    // 4. ACTION: VERIFY 4-DIGIT PIN (FAST 1-STEP DAILY LOGIN)
    // -------------------------------------------------------------------------
    if (action === 'verify_pin') {
      if (!pin || String(pin).length !== 4) {
        return NextResponse.json({ error: '4-digit PIN required' }, { status: 400 });
      }

      const { data: staff } = await supabaseAdmin
        .from('staff_whitelist')
        .select('*')
        .or(`phone.eq.${cleanPhone},phone.eq.91${cleanPhone},phone.eq.+91${cleanPhone}`)
        .maybeSingle();

      const { data: orgFounder } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .or(`founder_phone.eq.${cleanPhone},founder_phone.eq.91${cleanPhone},founder_phone.eq.+91${cleanPhone}`)
        .maybeSingle();

      if (!staff && !orgFounder) {
        return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
      }

      // Check lock state
      if (staff?.locked_until && new Date(staff.locked_until).getTime() > Date.now()) {
        return NextResponse.json({
          error: 'Account temporarily locked due to repeated incorrect PIN attempts. Use "Forgot PIN?" to reset via WhatsApp OTP.',
        }, { status: 423 });
      }

      // Check if user has a PIN configured
      if (!staff?.pin_hash) {
        return NextResponse.json({
          error: 'No PIN configured yet. Please log in using WhatsApp OTP to create your PIN.',
          needsSetup: true,
        }, { status: 400 });
      }

      // Strict bcrypt PIN verification
      const isValidPin = await bcrypt.compare(String(pin), staff.pin_hash);

      if (!isValidPin) {
        const attempts = (staff.failed_pin_attempts || 0) + 1;
        const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
        await supabaseAdmin
          .from('staff_whitelist')
          .update({ failed_pin_attempts: attempts, locked_until: lockedUntil })
          .eq('id', staff.id);

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

      // Reset failed attempts on success
      await supabaseAdmin
        .from('staff_whitelist')
        .update({ failed_pin_attempts: 0, locked_until: null })
        .eq('id', staff.id);

      // Resolve organization
      let orgRecord = orgFounder;
      if (!orgRecord && staff?.organization_id) {
        const { data: org } = await supabaseAdmin
          .from('organizations')
          .select('*')
          .eq('id', staff.organization_id)
          .maybeSingle();
        orgRecord = org;
      }

      const orgSlug = orgRecord?.slug || 'org_mangalagiri';

      return NextResponse.json({
        success: true,
        session: {
          staffId: staff?.id || 'founder-admin',
          name: staff?.full_name || orgRecord?.mla_name || 'Ramesh Darisi',
          phone: cleanPhone,
          role: staff?.role || 'ADMIN',
          organizationId: staff?.organization_id || orgRecord?.id || '00000000-0000-0000-0000-000000000001',
          organizationSlug: orgSlug,
          organizationName: orgRecord?.name || 'Mangalagiri Assembly',
          assignedWardId: staff?.assigned_ward_id || null,
        },
      });
    }

    // -------------------------------------------------------------------------
    // 5. ACTION: SET OR RESET 4-DIGIT PIN (SYNCED TO SUPABASE ACROSS ALL DEVICES)
    // -------------------------------------------------------------------------
    if (action === 'set_pin' || action === 'reset_pin') {
      const pinToSet = String(newPin || pin || '').trim();

      if (!pinToSet || pinToSet.length !== 4 || !/^\d{4}$/.test(pinToSet)) {
        return NextResponse.json({ error: 'PIN must be exactly 4 digits (0-9)' }, { status: 400 });
      }

      // Verify that the user authenticated via WhatsApp OTP
      const resetAuth = verifyStoredOtp(`reset_${cleanPhone}`, 'VERIFIED');
      const directOtpAuth = otp ? verifyStoredOtp(cleanPhone, String(otp).trim()) : null;

      if (!resetAuth.valid && (!directOtpAuth || !directOtpAuth.valid)) {
        return NextResponse.json({
          error: 'Verification session expired. Please verify with WhatsApp OTP again.',
        }, { status: 401 });
      }

      // Hash the 4-digit PIN with bcrypt
      const hashedPin = await bcrypt.hash(pinToSet, 10);

      // Update in Supabase staff_whitelist
      const { data: updatedStaff, error: updateErr } = await supabaseAdmin
        .from('staff_whitelist')
        .update({
          pin_hash: hashedPin,
          failed_pin_attempts: 0,
          locked_until: null,
          updated_at: new Date().toISOString(),
        })
        .or(`phone.eq.${cleanPhone},phone.eq.91${cleanPhone},phone.eq.+91${cleanPhone}`)
        .select('*')
        .maybeSingle();

      if (updateErr) {
        return NextResponse.json({ error: 'Failed to save security PIN to database' }, { status: 500 });
      }

      // Check if Founder organization
      const { data: orgFounder } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .or(`founder_phone.eq.${cleanPhone},founder_phone.eq.91${cleanPhone},founder_phone.eq.+91${cleanPhone}`)
        .maybeSingle();

      let orgRecord = orgFounder;
      if (!orgRecord && updatedStaff?.organization_id) {
        const { data: org } = await supabaseAdmin
          .from('organizations')
          .select('*')
          .eq('id', updatedStaff.organization_id)
          .maybeSingle();
        orgRecord = org;
      }

      const orgSlug = orgRecord?.slug || 'org_mangalagiri';

      return NextResponse.json({
        success: true,
        pinUpdated: true,
        message: 'Security PIN set successfully! It is now synced across all your devices.',
        session: {
          staffId: updatedStaff?.id || 'founder-admin',
          name: updatedStaff?.full_name || orgRecord?.mla_name || 'Ramesh Darisi',
          phone: cleanPhone,
          role: updatedStaff?.role || 'ADMIN',
          organizationId: updatedStaff?.organization_id || orgRecord?.id || '00000000-0000-0000-0000-000000000001',
          organizationSlug: orgSlug,
          organizationName: orgRecord?.name || 'Mangalagiri Assembly',
          assignedWardId: updatedStaff?.assigned_ward_id || null,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
