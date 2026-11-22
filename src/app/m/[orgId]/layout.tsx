'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  ShieldCheck,
  Users,
  Settings,
  BarChart3,
  PhoneCall,
  Bell,
  Globe2,
  Lock,
  LogOut,
  ChevronRight,
  Sparkles,
  AlertCircle,
  ExternalLink,
  QrCode,
  MessageSquare,
  RotateCcw,
  KeyRound
} from 'lucide-react';
import { UserRole } from '@/types';

interface SessionUser {
  staffId: string;
  name: string;
  phone: string;
  role: UserRole;
  organizationId: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  mlaName: string;
  mlaDesignation: string;
  constituencySlogan: string;
}

export default function ManagementLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const resolvedParams = use(params);
  const orgParam = resolvedParams.orgId;
  const pathname = usePathname();
  const router = useRouter();

  // Authentication State
  const [session, setSession] = useState<SessionUser | null>(null);
  const [authStep, setAuthStep] = useState<'PHONE' | 'OTP' | 'PIN'>('PHONE');
  const [inputPhone, setInputPhone] = useState('9206651295'); // default founder
  const [inputOtp, setInputOtp] = useState('');
  const [inputPin, setInputPin] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Organization Metadata
  const [org, setOrg] = useState<Organization | null>(null);
  const [pendingReviewCount, setPendingReviewCount] = useState<number>(0);

  // Timer for OTP resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Initial load session check
  useEffect(() => {
    const saved = localStorage.getItem('praja_seva_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSession(parsed);
      } catch {}
    }
    setIsVerifyingSession(false);
  }, []);

  // Fetch Org metadata & Pending Review tickets count
  useEffect(() => {
    async function fetchOrgInfo() {
      try {
        const res = await fetch(`/api/organizations/${orgParam}`);
        const data = await res.json();
        if (data.success) {
          setOrg(data.organization);
        }
      } catch {}

      // Count pending review
      try {
        const countRes = await fetch(`/api/management/tickets?status=PENDING_APPROVAL`);
        const countData = await countRes.json();
        if (countData.tickets) {
          setPendingReviewCount(countData.tickets.length);
        }
      } catch {}
    }
    fetchOrgInfo();
  }, [orgParam]);

  // Handle WhatsApp OTP Flow
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');

      setAuthStep('OTP');
      setResendCooldown(45);
    } catch (err: any) {
      setAuthError(err.message || 'Unable to send OTP. Please contact your constituency office.');
    } finally {
      setAuthLoading(false);
    }
  };

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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid OTP');

      const userSession: SessionUser = {
        staffId: data.session.staffId,
        name: data.session.name,
        phone: data.session.phone,
        role: data.session.role,
        organizationId: data.session.organizationId,
      };

      setSession(userSession);
      localStorage.setItem('praja_seva_session', JSON.stringify(userSession));
    } catch (err: any) {
      setAuthError(err.message || 'Incorrect verification code. Please check WhatsApp.');
    } finally {
      setAuthLoading(false);
    }
  };

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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Incorrect PIN');

      const userSession: SessionUser = {
        staffId: data.session.staffId,
        name: data.session.name,
        phone: data.session.phone,
        role: data.session.role,
        organizationId: data.session.organizationId,
      };

      setSession(userSession);
      localStorage.setItem('praja_seva_session', JSON.stringify(userSession));
    } catch (err: any) {
      setAuthError(err.message || 'Incorrect 4-digit PIN. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('praja_seva_session');
    setSession(null);
    setAuthStep('PHONE');
    setInputPin('');
    setInputOtp('');
  };

  // Navigation Links
  const navItems = [
    {
      label: 'Operations Board',
      href: `/m/${orgParam}`,
      exact: true,
      icon: ClipboardList,
      badge: null,
    },
    {
      label: 'Review & QA Gate',
      href: `/m/${orgParam}/review`,
      exact: false,
      icon: ShieldCheck,
      badge: pendingReviewCount > 0 ? `${pendingReviewCount} Pending` : null,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    {
      label: 'Staff & Volunteers',
      href: `/m/${orgParam}/staff`,
      exact: false,
      icon: Users,
      badge: null,
    },
    {
      label: 'Ward Analytics',
      href: `/m/${orgParam}/analytics`,
      exact: false,
      icon: BarChart3,
      badge: null,
    },
    {
      label: 'Settings & QR Poster',
      href: `/m/${orgParam}/settings`,
      exact: false,
      icon: Settings,
      badge: null,
    },
  ];

  if (isVerifyingSession) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If Not Authenticated -> Show Clean Login Screen
  if (!session) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
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

            {/* STEP 1: PHONE INPUT */}
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
                      onChange={(e) => setInputPhone(e.target.value)}
                      placeholder="Enter mobile number"
                      maxLength={10}
                      className="w-full h-11 pl-12 pr-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading || inputPhone.replace(/\D/g, '').length < 10}
                  className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 whitespace-nowrap"
                >
                  {authLoading ? 'Sending WhatsApp OTP...' : 'Login to Portal'}
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
                      Change
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

            {/* STEP 2 FALLBACK: 4-DIGIT PIN */}
            {authStep === 'PIN' && (
              <form onSubmit={handleVerifyPin} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Enter 4-Digit Security PIN
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthStep('OTP');
                        setInputPin('');
                        setAuthError(null);
                      }}
                      className="text-xs text-blue-600 hover:underline font-semibold"
                    >
                      Use WhatsApp OTP
                    </button>
                  </div>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={inputPin}
                    onChange={(e) => setInputPin(e.target.value)}
                    placeholder="••••"
                    className="w-full h-12 px-4 text-center tracking-[1em] font-mono text-2xl font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                    Authorizing +91 {inputPhone}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={authLoading || inputPin.length < 4}
                  className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {authLoading ? 'Verifying PIN...' : 'Continue with PIN'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Executive Dashboard Shell
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-800 antialiased flex">
      {/* 1. Left Persistent Sidebar (~280px) */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-white border-r border-slate-200 z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col">
          {/* Header Brand */}
          <div className="h-16 px-4 flex items-center gap-3 bg-slate-50 border-b border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-sm truncate">Praja Seva</span>
                <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wide">
                  Gov
                </span>
              </div>
              <span className="text-xs text-slate-500 truncate">
                {org?.name || 'Constituency Ops'}
              </span>
            </div>
          </div>

          {/* Seat Badge */}
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Operational Seat
                </span>
                <span className="text-xs font-bold text-slate-900 truncate">
                  {org?.mlaName || 'Secretariat Office'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 p-3">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        isActive
                          ? 'bg-white/20 text-white border-white/30'
                          : item.badgeColor || 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Direct QR & Helpline Box */}
        <div className="p-4 border-t border-slate-200 flex flex-col gap-3">
          <Link
            href={`/p/${orgParam}`}
            target="_blank"
            className="p-3 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 transition flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-blue-600" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-blue-900">Citizen QR Portal</span>
                <span className="text-[10px] text-blue-600">Open live public form</span>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
          </Link>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Logged in as</span>
              <span className="text-xs font-bold text-slate-900 truncate">{session.name}</span>
              <span className="text-[10px] text-blue-600 font-semibold">{session.role}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Main Executive Workspace */}
      <div className="pl-72 flex-1 flex flex-col min-w-0">
        {/* Top Sticky Bar */}
        <header className="sticky top-0 z-40 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-800">Ground Network Active</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 font-medium">Auto-Sync On</span>
            </div>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200">
              Executive Admin Chamber
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition"
            >
              <Globe2 className="w-3.5 h-3.5 text-blue-600" />
              <span>తెలుగు | EN</span>
            </button>

            <Link
              href={`/m/${orgParam}/review`}
              className="relative p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
              title="Review Queue"
            >
              <Bell className="w-4 h-4" />
              {pendingReviewCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-bold leading-tight">
                  {pendingReviewCount}
                </span>
              )}
            </Link>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                {session.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 leading-tight">
                  {session.name}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {session.role === 'ADMIN' ? 'Chief of Staff' : 'Field Volunteer'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Injection */}
        <main className="p-6 max-w-[1440px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
