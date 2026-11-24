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
  KeyRound,
  Menu,
  X,
  UserCheck
} from 'lucide-react';
import { IndianLanguage, MGMT_TRANSLATIONS } from '@/lib/mgmtI18n';
import { SUPPORTED_LANGUAGES } from '@/lib/landingI18n';
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

  // Multi-Language & Mobile Menu State
  const [lang, setLang] = useState<IndianLanguage>('en');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const savedLang = localStorage.getItem('praja_seva_lang') as IndianLanguage;
    if (savedLang && MGMT_TRANSLATIONS[savedLang]) {
      setLang(savedLang);
    }
  }, []);

  const handleSelectLang = (newLang: IndianLanguage) => {
    setLang(newLang);
    setIsLangMenuOpen(false);
    localStorage.setItem('praja_seva_lang', newLang);
    window.dispatchEvent(new CustomEvent('praja_lang_change', { detail: newLang }));
  };

  const t = MGMT_TRANSLATIONS[lang] || MGMT_TRANSLATIONS.en;

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

  // Volunteer role enforcement: dedicated single-page field desk
  useEffect(() => {
    if (session?.role === 'VOLUNTEER' && pathname !== `/m/${orgParam}/volunteer`) {
      router.replace(`/m/${orgParam}/volunteer`);
    }
  }, [session?.role, pathname, orgParam, router]);

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
      label: t.navBoard,
      href: `/m/${orgParam}`,
      exact: true,
      icon: ClipboardList,
      badge: null,
    },
    {
      label: t.navApprove,
      href: `/m/${orgParam}/review`,
      exact: false,
      icon: ShieldCheck,
      badge: pendingReviewCount > 0 ? `${pendingReviewCount}` : null,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    {
      label: t.volunteerDeskTitle || 'Volunteer Desk',
      href: `/m/${orgParam}/volunteer`,
      exact: false,
      icon: UserCheck,
      badge: null,
    },
    {
      label: t.navStaff,
      href: `/m/${orgParam}/staff`,
      exact: false,
      icon: Users,
      badge: null,
    },
    {
      label: t.navAnalytics,
      href: `/m/${orgParam}/analytics`,
      exact: false,
      icon: BarChart3,
      badge: null,
    },
    {
      label: t.navSettings,
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

  // Navigation Sidebar Content Helper (Shared between desktop sidebar & mobile drawer)
  const renderSidebarContent = (isMobile: boolean = false) => (
    <div className="h-full flex flex-col justify-between">
      <div className="flex flex-col">
        {/* Header Brand */}
        <div className="h-16 px-4 flex items-center justify-between bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs font-bold shrink-0">
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
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Operational Seat Info */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t.constituencySeat}
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
                onClick={() => isMobile && setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
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

      {/* Bottom Direct QR & User Box */}
      <div className="p-4 border-t border-slate-200 flex flex-col gap-3">
        <Link
          href={`/p/${orgParam}`}
          target="_blank"
          onClick={() => isMobile && setMobileMenuOpen(false)}
          className="p-3 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 transition flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-blue-600" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-blue-900">{t.navCitizenPortal}</span>
              <span className="text-[10px] text-blue-600">{t.navOpenPublicForm}</span>
            </div>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
        </Link>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase">{t.navLoggedInAs}</span>
            <span className="text-xs font-bold text-slate-900 truncate">{session.name}</span>
            <span className="text-[10px] text-blue-600 font-semibold">{session.role}</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
            title={t.navLogout}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  // Authenticated Executive / Volunteer Dashboard Shell
  const isVolunteer = session.role === 'VOLUNTEER';

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-800 antialiased flex flex-col lg:flex-row">
      {/* 1. Desktop Persistent Sidebar (Only for ADMIN on lg: 1024px and up) */}
      {!isVolunteer && (
        <aside className="hidden lg:flex fixed left-0 top-0 h-full w-72 bg-white border-r border-slate-200 z-50 flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
          {renderSidebarContent(false)}
        </aside>
      )}

      {/* 2. Mobile Slide-Over Drawer with Backdrop (Only for ADMIN) */}
      {!isVolunteer && mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white h-full z-10 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* 3. Main Workspace Area */}
      <div className={`${isVolunteer ? 'pl-0 pb-6' : 'pl-0 lg:pl-72 pb-20 lg:pb-6'} flex-1 flex flex-col min-w-0`}>
        {/* Top Sticky Bar */}
        <header className="sticky top-0 z-40 h-14 sm:h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3.5 sm:px-6 flex items-center justify-between gap-2">
          {/* Left: Brand / Volunteer Title / Desktop Status Pill */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {!isVolunteer && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-1 rounded-xl text-slate-700 hover:bg-slate-100 transition active:scale-95"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <div className={`flex items-center gap-2 ${!isVolunteer ? 'lg:hidden' : ''} min-w-0`}>
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-black text-slate-900 text-xs sm:text-sm truncate">Praja Seva</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                </div>
                <span className="text-[10px] text-slate-500 truncate">
                  {isVolunteer ? (t.volunteerDeskTitle || 'Volunteer Desk') : (org?.name || 'Constituency Ops')}
                </span>
              </div>
            </div>

            {!isVolunteer && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-slate-800">{t.groundNetworkActive}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 font-medium">{t.autoSyncOn}</span>
              </div>
            )}
          </div>

          {/* Right: Language + (Bell if Admin) + User Avatar + Logout */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Interactive Indian Language Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1 sm:gap-1.5 transition cursor-pointer whitespace-nowrap active:scale-95"
              >
                <Globe2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-[11px] sm:text-xs">
                  {SUPPORTED_LANGUAGES.find((l) => l.code === lang)?.nativeName || 'తెలుగు'}
                </span>
              </button>

              {isLangMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Language / భాష
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => handleSelectLang(l.code)}
                        className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between hover:bg-slate-50 transition cursor-pointer ${
                          lang === l.code ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-slate-700'
                        }`}
                      >
                        <span>{l.nativeName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({l.name})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notification Bell (Only for ADMIN) */}
            {!isVolunteer && (
              <Link
                href={`/m/${orgParam}/review`}
                className="relative p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition active:scale-95 shrink-0"
                title="Review Queue"
              >
                <Bell className="w-4 h-4" />
                {pendingReviewCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-bold leading-tight">
                    {pendingReviewCount}
                  </span>
                )}
              </Link>
            )}

            {/* User Avatar & Logout */}
            <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
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
              {isVolunteer && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition ml-1"
                  title={t.navLogout}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Injection */}
        <main className="p-3.5 sm:p-6 max-w-[1440px] w-full mx-auto">{children}</main>
      </div>

      {/* 4. One-Handed Mobile Bottom Navigation Bar (ONLY FOR ADMIN) */}
      {!isVolunteer && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
          {/* Operations Board */}
          <Link
            href={`/m/${orgParam}`}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition min-w-[56px] ${
              pathname === `/m/${orgParam}`
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 leading-tight">{t.navBoardShort || t.navBoard}</span>
          </Link>

          {/* Approvals (Review Desk) with red badge */}
          <Link
            href={`/m/${orgParam}/review`}
            className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition min-w-[56px] ${
              pathname.startsWith(`/m/${orgParam}/review`)
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative">
              <ShieldCheck className="w-5 h-5" />
              {pendingReviewCount > 0 && (
                <span className="absolute -top-1 -right-2 px-1 rounded-full bg-red-600 text-white text-[9px] font-bold">
                  {pendingReviewCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 leading-tight">{t.navApprove}</span>
          </Link>

          {/* Volunteer Desk */}
          <Link
            href={`/m/${orgParam}/volunteer`}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition min-w-[56px] ${
              pathname.startsWith(`/m/${orgParam}/volunteer`)
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 leading-tight">Volunteer</span>
          </Link>

          {/* Volunteers / Staff */}
          <Link
            href={`/m/${orgParam}/staff`}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition min-w-[56px] ${
              pathname.startsWith(`/m/${orgParam}/staff`)
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 leading-tight">{t.navStaffShort || t.navStaff}</span>
          </Link>

          {/* Settings */}
          <Link
            href={`/m/${orgParam}/settings`}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition min-w-[56px] ${
              pathname.startsWith(`/m/${orgParam}/settings`)
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 leading-tight">{t.navSettings}</span>
          </Link>
        </nav>
      )}
    </div>
  );
}
