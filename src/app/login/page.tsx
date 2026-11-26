'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PwaInstallButton from '@/components/PwaInstallButton';
import {
  Lock,
  AlertCircle,
  ChevronRight,
  MessageSquare,
  RotateCcw,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  UserCheck,
  Building2
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect');
  const reasonParam = searchParams.get('reason');

  // Step state: PHONE -> PIN (if 1 org + pin) -> OTP -> SELECT_ORG (if 2+ orgs) -> SET_PIN
  const [authStep, setAuthStep] = useState<'PHONE' | 'PIN' | 'OTP' | 'SELECT_ORG' | 'SET_PIN'>('PHONE');
  const [flowReason, setFlowReason] = useState<'LOGIN' | 'FORGOT_PIN' | 'NEW_USER'>('LOGIN');
  const [orgSessions, setOrgSessions] = useState<any[]>([]);
  const [selectedOrgSession, setSelectedOrgSession] = useState<any | null>(null);

  const [inputPhone, setInputPhone] = useState('');
  const [inputPin, setInputPin] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // If already logged in, redirect right away (unless redirected due to remote PIN change)
  useEffect(() => {
    if (reasonParam === 'pin_changed') {
      localStorage.removeItem('praja_seva_session');
      setAuthError('Security Alert: Your security PIN was changed on another device. Please log in with your new PIN.');
      return;
    }
    if (reasonParam === 'revoked') {
      localStorage.removeItem('praja_seva_session');
      setAuthError('Access Alert: Your account authorization was revoked by the administrator.');
      return;
    }

    const saved = localStorage.getItem('praja_seva_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.organizationSlug || parsed?.role) {
          const orgSlug = parsed.organizationSlug || 'org_mangalagiri';
          const destination = redirectTarget || (
            parsed.role === 'VOLUNTEER'
              ? `/m/${orgSlug}/volunteer`
              : `/m/${orgSlug}`
          );
          router.replace(destination);
        }
      } catch {}
    }
  }, [router, redirectTarget, reasonParam]);

  // Smart Indian Phone Input Sanitizer: Automatically strips +91, 91, or leading 0 if pasted/typed
  const handlePhoneChange = (val: string) => {
    let digits = val.replace(/\D/g, '');
    if (digits.startsWith('91') && digits.length > 10) {
      digits = digits.slice(2);
    } else if (digits.startsWith('0') && digits.length > 10) {
      digits = digits.slice(1);
    }
    setInputPhone(digits.slice(0, 10));
    setAuthError(null);
  };

  // Timer for OTP resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Complete Login & Redirect
  const handleSessionLogin = (session: any) => {
    localStorage.setItem('praja_seva_session', JSON.stringify(session));
    const orgSlug = session.organizationSlug || 'org_mangalagiri';
    const validRedirect = redirectTarget && redirectTarget.startsWith(`/m/${orgSlug}`) ? redirectTarget : null;
    const destination = validRedirect || (
      session.role === 'VOLUNTEER'
        ? `/m/${orgSlug}/volunteer`
        : `/m/${orgSlug}`
    );
    router.push(destination);
  };

  // Step 1: Check Phone Whitelist & PIN state
  const handleCheckPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPhone.length < 10) return;
    setAuthError(null);
    setAuthLoading(true);

    try {
      const res = await fetch('/api/management/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_phone', phone: inputPhone }),
      });
      const data = await res.json().catch(() => ({ error: 'Unable to connect to authentication server' }));

      if (!res.ok) {
        throw new Error(data.error || 'Access restricted. Please contact your administrator.');
      }

      setUserName(data.name || '');
      setUserRole(data.role || 'ADMIN');

      if (data.locked) {
        throw new Error('Account temporarily locked due to repeated failed attempts. Use "Forgot PIN?" to reset via WhatsApp OTP.');
      }

      if (data.multiOrg) {
        // Enrolled in 2+ organizations -> verify ownership via WhatsApp OTP first, then list organizations
        setFlowReason('LOGIN');
        await triggerSendOtp();
        setAuthStep('OTP');
      } else if (data.hasPin) {
        // User has already set up their PIN -> Go to fast 1-tap PIN login
        setAuthStep('PIN');
        setInputPin('');
      } else {
        // New user or has no PIN yet -> Send WhatsApp OTP and transition to OTP setup
        setFlowReason('NEW_USER');
        await triggerSendOtp();
        setAuthStep('OTP');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Unable to verify phone number');
    } finally {
      setAuthLoading(false);
    }
  };

  // Trigger Send WhatsApp OTP helper
  const triggerSendOtp = async () => {
    const res = await fetch('/api/management/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send_otp', phone: inputPhone }),
    });
    const data = await res.json().catch(() => ({ error: 'Unable to send OTP' }));
    if (!res.ok) throw new Error(data.error || 'Failed to dispatch WhatsApp OTP');
    setResendCooldown(45);
  };

  // Step 2A: Verify 4-Digit PIN
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPin.length !== 4) return;
    setAuthError(null);
    setAuthLoading(true);

    try {
      const res = await fetch('/api/management/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_pin', phone: inputPhone, pin: inputPin }),
      });
      const data = await res.json().catch(() => ({ error: 'Unable to reach authentication server' }));

      if (!res.ok) {
        throw new Error(data.error || 'Incorrect PIN');
      }

      handleSessionLogin(data.session);
    } catch (err: any) {
      setAuthError(err.message || 'Invalid PIN code');
    } finally {
      setAuthLoading(false);
    }
  };

  // Step 2B: Clicked "Forgot PIN?"
  const handleForgotPin = async () => {
    setAuthError(null);
    setAuthLoading(true);
    setFlowReason('FORGOT_PIN');

    try {
      await triggerSendOtp();
      setAuthStep('OTP');
      setInputOtp('');
    } catch (err: any) {
      setAuthError(err.message || 'Failed to send WhatsApp verification code');
    } finally {
      setAuthLoading(false);
    }
  };

  // Step 2C: Clicked "Login with WhatsApp OTP instead"
  const handleOtpLoginSwitch = async () => {
    setAuthError(null);
    setAuthLoading(true);
    setFlowReason('LOGIN');

    try {
      await triggerSendOtp();
      setAuthStep('OTP');
      setInputOtp('');
    } catch (err: any) {
      setAuthError(err.message || 'Failed to send WhatsApp verification code');
    } finally {
      setAuthLoading(false);
    }
  };

  // Step 3: Verify WhatsApp OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputOtp.length < 6) return;
    setAuthError(null);
    setAuthLoading(true);

    try {
      const res = await fetch('/api/management/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_otp', phone: inputPhone, code: inputOtp }),
      });
      const data = await res.json().catch(() => ({ error: 'Unable to reach authentication server' }));

      if (!res.ok) {
        throw new Error(data.error || 'Invalid OTP code');
      }

      if (data.sessions && data.sessions.length > 1) {
        setOrgSessions(data.sessions);
        setAuthStep('SELECT_ORG');
      } else {
        setSelectedOrgSession(data.session);
        if (flowReason === 'NEW_USER' || flowReason === 'FORGOT_PIN' || !data.hasPin) {
          // Transition to PIN creation / reset
          setAuthStep('SET_PIN');
          setNewPin('');
          setConfirmPin('');
        } else {
          // Direct OTP login
          handleSessionLogin(data.session);
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Incorrect verification code. Please check your WhatsApp.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Step 4: Save new PIN to Supabase (cross-device sync)
  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setAuthError('PIN must be exactly 4 numeric digits');
      return;
    }
    if (newPin !== confirmPin) {
      setAuthError('PINs do not match. Please re-enter.');
      return;
    }

    setAuthError(null);
    setAuthLoading(true);

    try {
      const res = await fetch('/api/management/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_pin',
          phone: inputPhone,
          newPin,
          organizationId: selectedOrgSession?.organizationId,
        }),
      });
      const data = await res.json().catch(() => ({ error: 'Unable to save PIN' }));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to set PIN');
      }

      setAuthSuccess('PIN saved successfully! Redirecting...');
      setTimeout(() => {
        handleSessionLogin(data.session);
      }, 700);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to save security PIN');
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
        <p className="mt-1 text-xs text-slate-500">
          Official Constituency Management & Field Volunteer Portal
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xs border border-slate-200 rounded-2xl sm:px-10">
          {authError && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{authSuccess}</span>
            </div>
          )}

          {/* ============================================================= */}
          {/* STEP 1: PHONE NUMBER INPUT                                     */}
          {/* ============================================================= */}
          {authStep === 'PHONE' && (
            <form onSubmit={handleCheckPhone} className="space-y-4">
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
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Enter your registered constituency mobile number to proceed.
                </p>
              </div>

              <button
                type="submit"
                disabled={authLoading || inputPhone.length < 10}
                className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {authLoading ? 'Verifying Account...' : 'Continue'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* ============================================================= */}
          {/* STEP 2: 4-DIGIT PIN ENTRY (DAILY FAST LOGIN)                   */}
          {/* ============================================================= */}
          {authStep === 'PIN' && (
            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    {userName ? userName.slice(0, 2).toUpperCase() : 'PS'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 truncate max-w-[170px]">
                      {userName || 'Staff Member'}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      +91 {inputPhone}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep('PHONE');
                    setInputPin('');
                    setAuthError(null);
                  }}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  Change
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 text-center">
                  Enter 4-Digit Security PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={inputPin}
                  onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full h-12 text-center tracking-[0.8em] font-mono text-2xl font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                disabled={authLoading || inputPin.length !== 4}
                className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {authLoading ? 'Verifying PIN...' : 'Login with PIN'}
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="pt-2 flex flex-col gap-2.5 text-center border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleForgotPin}
                  disabled={authLoading}
                  className="text-xs text-amber-700 hover:text-amber-800 font-semibold hover:underline"
                >
                  Forgot PIN? Reset via WhatsApp OTP
                </button>
                <button
                  type="button"
                  onClick={handleOtpLoginSwitch}
                  disabled={authLoading}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                >
                  Or login with WhatsApp OTP instead
                </button>
              </div>
            </form>
          )}

          {/* ============================================================= */}
          {/* STEP 3: WHATSAPP OTP VERIFICATION                             */}
          {/* ============================================================= */}
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

                <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
                  <span>Sent to WhatsApp +91 {inputPhone}</span>
                  {resendCooldown > 0 ? (
                    <span className="text-slate-400 font-mono font-medium">{resendCooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => triggerSendOtp()}
                      disabled={authLoading}
                      className="text-blue-600 hover:underline font-semibold flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Resend OTP
                    </button>
                  )}
                </div>
              </div>

              {flowReason === 'NEW_USER' && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>First-Time Setup:</strong> After verifying this WhatsApp code, you will create your private 4-digit PIN.
                  </span>
                </div>
              )}

              {flowReason === 'FORGOT_PIN' && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                  <KeyRound className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Resetting PIN:</strong> Verify your WhatsApp identity to choose a new 4-digit PIN.
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading || inputOtp.length < 6}
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {authLoading
                  ? 'Verifying OTP...'
                  : flowReason === 'LOGIN'
                  ? 'Verify OTP & Login'
                  : 'Verify & Create PIN'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* ============================================================= */}
          {/* STEP 3B: SELECT ORGANIZATION (FOR MULTI-ORG ENROLLMENTS)      */}
          {/* ============================================================= */}
          {authStep === 'SELECT_ORG' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep('PHONE');
                    setAuthError(null);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  {orgSessions.length} Organizations Found
                </span>
              </div>

              <div className="text-center pb-1">
                <h3 className="text-base font-extrabold text-slate-900">Select Organization</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose which constituency workspace you want to open
                </p>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {orgSessions.map((orgSess) => (
                  <button
                    key={orgSess.organizationId}
                    type="button"
                    onClick={() => {
                      setSelectedOrgSession(orgSess);
                      if (!orgSess.hasPin) {
                        setAuthStep('SET_PIN');
                        setNewPin('');
                        setConfirmPin('');
                      } else {
                        handleSessionLogin(orgSess);
                      }
                    }}
                    className="w-full p-3.5 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition flex items-center justify-between gap-3 text-left cursor-pointer group active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-slate-900 truncate">
                          {orgSess.organizationName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            orgSess.role === 'ADMIN'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {orgSess.role === 'ADMIN' ? 'Admin' : 'Field Volunteer'}
                          </span>
                          {!orgSess.hasPin && (
                            <span className="text-[10px] text-amber-600 font-semibold">
                              • Setup PIN
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* STEP 4: SET / RESET 4-DIGIT PIN (SYNCED ACROSS ALL DEVICES)   */}
          {/* ============================================================= */}
          {authStep === 'SET_PIN' && (
            <form onSubmit={handleSavePin} className="space-y-4">
              <div className="text-center pb-1">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2 border border-blue-100">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {flowReason === 'FORGOT_PIN' ? 'Create New Security PIN' : 'Set Your 4-Digit Security PIN'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose a 4-digit PIN for instant 1-tap login across all your devices.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  New 4-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full h-11 text-center tracking-[0.8em] font-mono text-xl font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Confirm 4-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full h-11 text-center tracking-[0.8em] font-mono text-xl font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-relaxed">
                  Your PIN is securely hashed and synced across any phone, tablet, or PC you use for Praja Seva.
                </span>
              </div>

              <button
                type="submit"
                disabled={authLoading || newPin.length !== 4 || confirmPin.length !== 4}
                className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {authLoading ? 'Saving Security PIN...' : 'Save PIN & Open Dashboard'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* Direct PWA Install Button */}
        <div className="mt-4">
          <PwaInstallButton />
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
