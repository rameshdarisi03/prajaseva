import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppOtp } from '@/lib/whatsapp';
import {
  storeOtp,
  verifyStoredOtp,
  createSignedOtpToken,
  verifySignedOtpToken,
} from '@/lib/otpStore';

function getMasterFounderPhone(): string {
  const raw = process.env.FOUNDER_PHONE || '9206651295';
  return raw.replace(/\D/g, '').slice(-10);
}

export async function POST(req: NextRequest) {
  try {
    const { action, phone, code } = await req.json();
    const masterPhone = getMasterFounderPhone();

    // 1. Check active founder session cookie
    if (action === 'check_session') {
      const sessionCookie = req.cookies.get('ps_founder_session')?.value;
      const check = verifySignedOtpToken(sessionCookie, `founder_${masterPhone}`, 'AUTHENTICATED');
      if (!check.valid) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
      }
      return NextResponse.json({
        authenticated: true,
        phone: masterPhone,
      });
    }

    // 2. Logout
    if (action === 'logout') {
      const res = NextResponse.json({ success: true });
      res.cookies.delete('ps_founder_session');
      return res;
    }

    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10 || cleanPhone !== masterPhone) {
      return NextResponse.json(
        { error: 'Access Denied: Only the Master Platform Founder can access this portal.' },
        { status: 403 }
      );
    }

    // 3. Send WhatsApp OTP to Master Founder
    if (action === 'send_otp') {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      storeOtp(`founder_otp_${cleanPhone}`, otpCode, 10 * 60 * 1000);

      const sent = await sendWhatsAppOtp(cleanPhone, otpCode);
      if (!sent) {
        return NextResponse.json(
          { error: 'Failed to send WhatsApp OTP. Please try again.' },
          { status: 502 }
        );
      }

      const token = createSignedOtpToken(`founder_otp_${cleanPhone}`, otpCode, 10 * 60 * 1000);
      const res = NextResponse.json({ success: true, message: 'Founder OTP sent to WhatsApp' });
      res.cookies.set('ps_founder_otp', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 600,
      });
      return res;
    }

    // 4. Verify WhatsApp OTP & issue 12-hour Founder Session Cookie
    if (action === 'verify_otp') {
      const inputCode = String(code || '').trim();
      if (!inputCode) {
        return NextResponse.json({ error: '6-digit OTP required' }, { status: 400 });
      }

      const cookie = req.cookies.get('ps_founder_otp')?.value;
      const cookieCheck = cookie
        ? verifySignedOtpToken(cookie, `founder_otp_${cleanPhone}`, inputCode)
        : null;
      const memCheck = cookieCheck?.valid
        ? cookieCheck
        : verifyStoredOtp(`founder_otp_${cleanPhone}`, inputCode);

      if (!memCheck.valid) {
        return NextResponse.json(
          { error: cookieCheck?.reason || memCheck.reason || 'Invalid OTP code' },
          { status: 401 }
        );
      }

      const sessionToken = createSignedOtpToken(
        `founder_${masterPhone}`,
        'AUTHENTICATED',
        12 * 60 * 60 * 1000
      );
      const res = NextResponse.json({
        success: true,
        authenticated: true,
        phone: masterPhone,
      });
      res.cookies.delete('ps_founder_otp');
      res.cookies.set('ps_founder_session', sessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 12 * 60 * 60,
      });
      return res;
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
