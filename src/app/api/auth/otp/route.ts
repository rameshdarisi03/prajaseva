import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppOtp } from '@/lib/whatsapp';
import {
  storeOtp,
  verifyStoredOtp,
  createSignedOtpToken,
  verifySignedOtpToken,
} from '@/lib/otpStore';

export async function POST(req: NextRequest) {
  try {
    const { action, phone, code } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    // 1. Action: SEND OTP
    if (action === 'send') {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      storeOtp(cleanPhone, otpCode, 5 * 60 * 1000);

      const sent = await sendWhatsAppOtp(cleanPhone, otpCode);
      if (!sent) {
        return NextResponse.json(
          { error: 'Failed to dispatch WhatsApp OTP. Please check your WhatsApp number.' },
          { status: 502 }
        );
      }

      const token = createSignedOtpToken(cleanPhone, otpCode, 5 * 60 * 1000);
      const res = NextResponse.json({
        success: true,
        message: 'OTP sent to WhatsApp successfully',
      });
      res.cookies.set('ps_citizen_otp', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 300,
      });
      return res;
    }

    // 2. Action: VERIFY OTP
    if (action === 'verify') {
      if (!code) {
        return NextResponse.json({ error: 'Verification code required' }, { status: 400 });
      }

      const cookie = req.cookies.get('ps_citizen_otp')?.value;
      const cookieResult = cookie ? verifySignedOtpToken(cookie, cleanPhone, code) : null;
      const result = cookieResult?.valid ? cookieResult : verifyStoredOtp(cleanPhone, code);

      if (!result.valid) {
        return NextResponse.json(
          { error: cookieResult?.reason || result.reason || 'Invalid verification code' },
          { status: 400 }
        );
      }

      const res = NextResponse.json({ success: true, verified: true });
      res.cookies.delete('ps_citizen_otp');
      return res;
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
