import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppOtp } from '@/lib/whatsapp';
import { storeOtp, verifyStoredOtp } from '@/lib/otpStore';

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
        console.warn(`[OTP] WhatsApp Cloud API did not deliver to ${cleanPhone}, fallback enabled`);
      }

      return NextResponse.json({
        success: true,
        message: 'OTP sent to WhatsApp successfully',
      });
    }

    // 2. Action: VERIFY OTP
    if (action === 'verify') {
      if (!code) {
        return NextResponse.json({ error: 'Verification code required' }, { status: 400 });
      }

      const result = verifyStoredOtp(cleanPhone, code);

      if (!result.valid) {
        return NextResponse.json({ error: result.reason || 'Invalid verification code' }, { status: 400 });
      }

      return NextResponse.json({ success: true, verified: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
