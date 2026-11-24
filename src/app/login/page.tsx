'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, AlertCircle, ChevronRight, MessageSquare, RotateCcw, KeyRound } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect');

  const [authStep, setAuthStep] = useState<'PHONE' | 'OTP' | 'PIN'>('PHONE');
  const [inputPhone, setInputPhone] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [inputPin, setInputPin] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Smart Indian Phone Input Sanitizer: Automatically strips +91, 91, or leading 0 if pasted/typed
  const handlePhoneChange = (val: string) => {
    let digits = val.replace(/\D/g, '');
    if (digits.startsWith('91') && digits.length > 10) {
      digits = digits.slice(2);
    } else if (digits.startsWith('0') && digits.length > 10) {
      digits = digits.slice(1);
    }
    setInputPhone(digits.slice(0, 10));
  };

  // Timer for OTP resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Step 1: Send WhatsApp OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);
    try {
      setAuthLoading(true);
      const res = await fetch('/api/management/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_otp', phone: inputPhone }),
      });
      const data = await res.json().catch(() => ({ error: 'Unable to reach authentication server' }));
      if (!res.ok) throw new Error(data.error || 'Server error');

      setAuthStep('OTP');
      setResendCooldown(45);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Load failed') || msg.includes('Failed to fetch')) {
        setAuthError('Network issue: Unable to connect. Please try 4-digit PIN login or check internet.');
      } else {
        setAuthError(msg || 'Unable to send OTP. Please contact your constituency office.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Step 2: Verify WhatsApp OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      setAuthLoading(true);
      const res = await fetch('/api/management/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_otp', phone: inputPhone, code: inputOtp }),
      });
      const data = await res.json().catch(() => ({ error: 'Unable to reach authentication server' }));
      if (!res.ok) throw new Error(data.error || 'Invalid OTP code');

      // Save session
      localStorage.setItem('praja_seva_session', JSON.stringify(data.session));

      // Redirect to user's assigned constituency or volunteer desk
      const orgSlug = data.session.organizationSlug || 'org_mangalagiri';
      const destination = redirectTarget || (
        data.session.role === 'VOLUNTEER'
          ? `/m/${orgSlug}/volunteer`
          : `/m/${orgSlug}`
      );
      router.push(destination);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Load failed') || msg.includes('Failed to fetch')) {
        setAuthError('Network issue: Please check connection or try 4-digit PIN.');
      } else {
        setAuthError(msg || 'Incorrect verification code. Please check WhatsApp.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Step 2 Fallback / Direct: Verify 4-Digit Security PIN
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      setAuthLoading(true);
      const res = await fetch('/api/management/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_pin', phone: inputPhone, pin: inputPin }),
      });
      const data = await res.json().catch(() => ({ error: 'Unable to reach authentication server' }));
      if (!res.ok) throw new Error(data.error || 'Incorrect PIN');

      localStorage.setItem('praja_seva_session', JSON.stringify(data.session));
      const orgSlug = data.session.organizationSlug || 'org_mangalagiri';
      const destination = redirectTarget || (
        data.session.role === 'VOLUNTEER'
          ? `/m/${orgSlug}/volunteer`
          : `/m/${orgSlug}`
      );
      router.push(destination);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Load failed') || msg.includes('Failed to fetch')) {
        setAuthError('Network issue: Please check connection and try again.');
      } else {
        setAuthError(msg || 'Incorrect 4-digit PIN. Please try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="mt-4 text-2xl font-extrabold text-slate-900 tracking-tight">
          Praja Seva Command Center
        </h2>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xs border border-slate-200 rounded-2xl sm:px-10">
          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* AUTH METHOD SELECTOR TABS */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-4">
            <button
              type="button"
              onClick={() => {
                setAuthStep('PHONE');
                setAuthError(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                authStep === 'PHONE' || authStep === 'OTP'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              WhatsApp OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthStep('PIN');
                setAuthError(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                authStep === 'PIN'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              4-Digit PIN
            </button>
          </div>

          {/* METHOD 1: PHONE INPUT FOR OTP */}
          {authStep === 'PHONE' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Official Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    +91
                  </div>
                  <input
                    type="tel"
                    value={inputPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    maxLength={16}
                    className="w-full h-11 pl-12 pr-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  We will send a 6-digit verification code to your WhatsApp
                </p>
              </div>

              <button
                type="submit"
                disabled={authLoading || inputPhone.length < 10}
                className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                {authLoading ? 'Sending WhatsApp OTP...' : 'Send WhatsApp OTP'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* STEP 2: WHATSAPP OTP VERIFICATION */}
          {authStep === 'OTP' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    Enter WhatsApp OTP
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthStep('PHONE');
                      setInputOtp('');
                      setAuthError(null);
                    }}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    Change Number
                  </button>
                </div>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={inputOtp}
                  onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full h-12 px-4 text-center tracking-[0.5em] font-mono text-2xl font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  required
                />

                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>Sent to WhatsApp +91 {inputPhone}</span>
                  {resendCooldown > 0 ? (
                    <span className="text-slate-400 font-mono">{resendCooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      disabled={authLoading}
                      className="text-blue-600 hover:underline font-semibold flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Resend
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading || inputOtp.length < 6}
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {authLoading ? 'Verifying OTP...' : 'Verify OTP & Login'}
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep('PIN');
                    setAuthError(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Or log in with 4-digit Security PIN
                </button>
              </div>
            </form>
          )}

          {/* METHOD 2: DIRECT 4-DIGIT PIN LOGIN */}
          {authStep === 'PIN' && (
            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Official Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    +91
                  </div>
                  <input
                    type="tel"
                    value={inputPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="Enter mobile number"
                    maxLength={16}
                    className="w-full h-11 pl-12 pr-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Enter 4-Digit Security PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={inputPin}
                  onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full h-12 px-4 text-center tracking-[1em] font-mono text-2xl font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                  PIN assigned by your constituency office
                </p>
              </div>

              <button
                type="submit"
                disabled={authLoading || inputPhone.length < 10 || inputPin.length < 4}
                className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {authLoading ? 'Verifying PIN...' : 'Login with PIN'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
