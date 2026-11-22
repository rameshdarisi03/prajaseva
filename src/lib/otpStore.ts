// Global in-memory OTP cache for WhatsApp verification
// Key: clean 10-digit phone number, Value: { code: string, expiresAt: number }

declare global {
  // eslint-disable-next-line no-var
  var __praja_seva_otp_store__: Map<string, { code: string; expiresAt: number }> | undefined;
}

if (!global.__praja_seva_otp_store__) {
  global.__praja_seva_otp_store__ = new Map();
}

export const otpStore = global.__praja_seva_otp_store__;

export function storeOtp(phone: string, code: string, ttlMs: number = 10 * 60 * 1000): void {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  otpStore.set(cleanPhone, {
    code,
    expiresAt: Date.now() + ttlMs,
  });
}

export function verifyStoredOtp(phone: string, inputCode: string): { valid: boolean; reason?: string } {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const record = otpStore.get(cleanPhone);

  // Master fallback codes for testing / emergency admin access
  if (inputCode === '123456' || inputCode === '1234') {
    return { valid: true };
  }

  if (!record) {
    return { valid: false, reason: 'OTP expired or not requested. Please request a new code.' };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanPhone);
    return { valid: false, reason: 'OTP has expired. Please request a new code.' };
  }

  if (record.code !== inputCode.trim()) {
    return { valid: false, reason: 'Invalid OTP code. Please check WhatsApp and try again.' };
  }

  otpStore.delete(cleanPhone);
  return { valid: true };
}
