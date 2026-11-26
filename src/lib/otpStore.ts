import crypto from 'crypto';

// Global in-memory OTP cache (local fallback) + Stateless HMAC-signed token helpers (Vercel serverless safe)
declare global {
  // eslint-disable-next-line no-var
  var __praja_seva_otp_store__: Map<string, { code: string; expiresAt: number }> | undefined;
}

if (!global.__praja_seva_otp_store__) {
  global.__praja_seva_otp_store__ = new Map();
}

export const otpStore = global.__praja_seva_otp_store__;

function getHmacSecret(): string {
  return (
    process.env.OTP_HMAC_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.META_WHATSAPP_TOKEN ||
    'praja-seva-otp-hmac-secret'
  );
}

function normalizeOtpKey(key: string): string {
  const prefixes = ['founder_otp_', 'founder_', 'verified_', 'reset_'];
  for (const prefix of prefixes) {
    if (key.startsWith(prefix)) {
      return `${prefix}${key.slice(prefix.length).replace(/\D/g, '').slice(-10)}`;
    }
  }
  return key.replace(/\D/g, '').slice(-10);
}

function hashCode(normalizedKey: string, code: string): string {
  return crypto
    .createHmac('sha256', getHmacSecret())
    .update(`${normalizedKey}:${code.trim()}`)
    .digest('hex');
}

export function createSignedOtpToken(key: string, code: string, ttlMs: number = 10 * 60 * 1000): string {
  const normalizedKey = normalizeOtpKey(key);
  const payload = {
    k: normalizedKey,
    h: hashCode(normalizedKey, code),
    exp: Date.now() + ttlMs,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', getHmacSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySignedOtpToken(
  token: string | undefined | null,
  key: string,
  inputCode: string
): { valid: boolean; reason?: string } {
  if (!token || !token.includes('.')) {
    return { valid: false, reason: 'OTP expired or not requested. Please request a new code.' };
  }

  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) {
    return { valid: false, reason: 'Invalid verification session. Please request a new code.' };
  }

  const expectedSig = crypto.createHmac('sha256', getHmacSecret()).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { valid: false, reason: 'Invalid verification session. Please request a new code.' };
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      k: string;
      h: string;
      exp: number;
    };
    const normalizedKey = normalizeOtpKey(key);
    if (payload.k !== normalizedKey) {
      return { valid: false, reason: 'Phone number mismatch. Please request a new code.' };
    }
    if (Date.now() > payload.exp) {
      return { valid: false, reason: 'OTP has expired. Please request a new code.' };
    }
    const inputHash = hashCode(normalizedKey, inputCode);
    if (payload.h !== inputHash) {
      return { valid: false, reason: 'Invalid OTP code. Please check WhatsApp and try again.' };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid verification session. Please request a new code.' };
  }
}

export function storeOtp(phone: string, code: string, ttlMs: number = 10 * 60 * 1000): void {
  const normalizedKey = normalizeOtpKey(phone);
  otpStore.set(normalizedKey, {
    code,
    expiresAt: Date.now() + ttlMs,
  });
}

export function verifyStoredOtp(phone: string, inputCode: string): { valid: boolean; reason?: string } {
  const normalizedKey = normalizeOtpKey(phone);
  const record = otpStore.get(normalizedKey);

  if (!record) {
    return { valid: false, reason: 'OTP expired or not requested. Please request a new code.' };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(normalizedKey);
    return { valid: false, reason: 'OTP has expired. Please request a new code.' };
  }

  if (record.code !== inputCode.trim()) {
    return { valid: false, reason: 'Invalid OTP code. Please check WhatsApp and try again.' };
  }

  otpStore.delete(normalizedKey);
  return { valid: true };
}
