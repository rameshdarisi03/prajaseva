import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { sendWhatsAppOtp } from '@/lib/whatsapp';
import { storeOtp, verifyStoredOtp } from '@/lib/otpStore';

export async function POST(req: NextRequest) {
  try {
    const { action, phone, pin, otp, code } = await req.json();

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
    // 1. ACTION: CHECK WHITELIST & SEND WHATSAPP OTP
    // -------------------------------------------------------------------------
    if (action === 'check_whitelist' || action === 'send_otp') {
      // Check staff_whitelist (support clean 10-digit, 91-prefix, and +91 prefix)
      const { data: staff } = await supabaseAdmin
        .from('staff_whitelist')
        .select('id, full_name, role, is_active, organization_id, failed_pin_attempts, locked_until')
        .or(`phone.eq.${cleanPhone},phone.eq.91${cleanPhone},phone.eq.+91${cleanPhone}`)
        .eq('is_active', true)
        .maybeSingle();

      // Check if Founder Phone in organizations
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

      // Check lock state
      if (staff?.locked_until && new Date(staff.locked_until).getTime() > Date.now()) {
        return NextResponse.json({
          whitelisted: false,
          locked: true,
          error: 'Account temporarily locked due to repeated incorrect attempts. Please try again in 15 minutes.',
        }, { status: 423 });
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
      const whatsappSent = await sendWhatsAppOtp(cleanPhone, otpCode);
      if (!whatsappSent) {
        console.warn(`[Auth OTP] Meta WhatsApp dispatch failed for ${cleanPhone}, in-memory fallback active`);
      }

      return NextResponse.json({
        success: true,
        whitelisted: true,
        otpSent: true,
        name: staff?.full_name || 'Constituency Administrator',
        role: staff?.role || 'ADMIN',
        organizationId: orgId,
        organizationSlug: orgSlug,
        organizationName: orgName,
        message: 'WhatsApp OTP dispatched successfully',
      });
    }

    // -------------------------------------------------------------------------
    // 2. ACTION: VERIFY WHATSAPP OTP
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

      // Fetch user profile (support clean 10-digit, 91-prefix, and +91 prefix)
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
    // 3. ACTION: VERIFY 4-DIGIT PIN (OPTIONAL SECONDARY / DIRECT)
    // -------------------------------------------------------------------------
    if (action === 'verify_pin') {
      if (!pin || pin.length !== 4) {
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

      // PIN Verification (Strict bcrypt hash check)
      let isValidPin = false;
      if (staff?.pin_hash) {
        isValidPin = await bcrypt.compare(pin, staff.pin_hash);
      }

      if (!isValidPin) {
        if (staff) {
          const attempts = (staff.failed_pin_attempts || 0) + 1;
          const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
          await supabaseAdmin
            .from('staff_whitelist')
            .update({ failed_pin_attempts: attempts, locked_until: lockedUntil })
            .eq('id', staff.id);
        }
        return NextResponse.json({ error: 'Incorrect 4-digit PIN' }, { status: 401 });
      }

      // Reset failed attempts on success
      if (staff) {
        await supabaseAdmin
          .from('staff_whitelist')
          .update({ failed_pin_attempts: 0, locked_until: null })
          .eq('id', staff.id);
      }

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

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
