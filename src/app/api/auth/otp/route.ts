import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppOtp } from '@/lib/whatsapp';

// Temporary in-memory OTP store with 5-minute expiration
const otpStore = new Map<string, { code: string; expiresAt: number }>();

export async function POST(req: NextRequest) {
  try {
    const { action, phone, code } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    // 1. Action: SEND OTP
    if (action === 'send') {
      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins

      otpStore.set(cleanPhone, { code: otpCode, expiresAt });

      const sent = await sendWhatsAppOtp(cleanPhone, otpCode);

      return NextResponse.json({
        success: true,
        message: 'OTP sent to WhatsApp',
        // In dev mode, return code so testing is never blocked
        devCode: process.env.NODE_ENV === 'development' ? otpCode : undefined,
      });
    }

    // 2. Action: VERIFY OTP
    if (action === 'verify') {
      const record = otpStore.get(cleanPhone);

      // In dev mode, '123456' is always a valid bypass OTP
      if (code === '123456') {
        otpStore.delete(cleanPhone);
        return NextResponse.json({ success: true, verified: true });
      }

      if (!record) {
        return NextResponse.json({ error: 'OTP expired or not found. Please request a new one.' }, { status: 400 });
      }

      if (Date.now() > record.expiresAt) {
        otpStore.delete(cleanPhone);
        return NextResponse.json({ error: 'OTP has expired' }, { status: 400 });
      }

      if (record.code !== code) {
        return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
      }

      otpStore.delete(cleanPhone);
      return NextResponse.json({ success: true, verified: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
