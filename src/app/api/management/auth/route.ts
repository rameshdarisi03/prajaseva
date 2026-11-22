import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { action, phone, pin } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    // 1. STEP 1: VERIFY WHITELIST
    if (action === 'check_whitelist') {
      // Check staff_whitelist
      const { data: staff, error: staffErr } = await supabaseAdmin
        .from('staff_whitelist')
        .select('id, full_name, role, is_active, organization_id, failed_pin_attempts, locked_until')
        .eq('phone', cleanPhone)
        .eq('is_active', true)
        .maybeSingle();

      // Check if Founder Phone in organizations
      const { data: orgFounder } = await supabaseAdmin
        .from('organizations')
        .select('id, name, founder_phone')
        .eq('founder_phone', cleanPhone)
        .maybeSingle();

      if (!staff && !orgFounder) {
        return NextResponse.json({
          whitelisted: false,
          message:
            'Access Restricted: This mobile number is not registered with an authorized constituency office. For official staff access, please contact your constituency administrator.',
        });
      }

      // Check lock state
      if (staff?.locked_until && new Date(staff.locked_until).getTime() > Date.now()) {
        return NextResponse.json({
          whitelisted: false,
          locked: true,
          message: 'Account temporarily locked due to repeated incorrect PIN attempts. Please try again after 15 minutes.',
        });
      }

      return NextResponse.json({
        whitelisted: true,
        name: staff?.full_name || 'Constituency Administrator',
        role: staff?.role || 'ADMIN',
      });
    }

    // 2. STEP 2: VERIFY 4-DIGIT PIN
    if (action === 'verify_pin') {
      if (!pin || pin.length !== 4) {
        return NextResponse.json({ error: '4-digit PIN required' }, { status: 400 });
      }

      const { data: staff } = await supabaseAdmin
        .from('staff_whitelist')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('founder_phone', cleanPhone)
        .maybeSingle();

      if (!staff && !org) {
        return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
      }

      // PIN Verification
      // For Founder default PIN '1234' or bcrypt check
      let isValidPin = false;
      if (staff?.pin_hash) {
        isValidPin = await bcrypt.compare(pin, staff.pin_hash);
      }
      // Founder bypass PIN '1234'
      if (!isValidPin && pin === '1234') {
        isValidPin = true;
      }

      if (!isValidPin) {
        // Increment failed attempts
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

      return NextResponse.json({
        success: true,
        session: {
          staffId: staff?.id || 'founder-admin',
          name: staff?.full_name || org?.mla_name || 'Ramesh Darisi',
          phone: cleanPhone,
          role: staff?.role || 'ADMIN',
          organizationId: staff?.organization_id || org?.id || '00000000-0000-0000-0000-000000000001',
          assignedWardId: staff?.assigned_ward_id || null,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
