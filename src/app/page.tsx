'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import PwaInstallButton from '@/components/PwaInstallButton';
import {
  Building2,
  Globe2,
  ArrowRight,
  Play,
  CheckCircle2,
  ShieldCheck,
  PhoneCall,
  QrCode,
  MapPin,
  Sparkles,
  Users,
  Send,
  Lock,
  X,
  FileCheck2,
  Radio,
  ExternalLink,
  Menu,
  Check,
  TrendingUp,
  Award,
  Zap,
  Activity,
  Phone
} from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  IndianLanguage,
  landingTranslations
} from '@/lib/landingI18n';

export default function HomePage() {
  const [selectedLang, setSelectedLang] = useState<IndianLanguage>('en');
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [briefingSubmitted, setBriefingSubmitted] = useState(false);

  // Form state
  const [repName, setRepName] = useState('');
  const [repRole, setRepRole] = useState('Sitting MLA');
  const [repSeat, setRepSeat] = useState('');
  const [repPhone, setRepPhone] = useState('');
  const [briefingFormat, setBriefingFormat] = useState('virtual');

  const t = landingTranslations[selectedLang] || landingTranslations.en;
  const targetOrgSlug = 'org_mangalagiri';

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBriefingSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#0F172A] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER NAVIGATION (CLEAN, 1-LINE, NO WRAPPING)                      */}
      {/* ========================================================================= */}
      <header className="sticky top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand: Strictly 1 line */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-700 transition-colors">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-slate-900 whitespace-nowrap">
                Praja Seva
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full whitespace-nowrap">
                GovTech
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links: Strictly 1 line per item with whitespace-nowrap */}
          <nav className="hidden xl:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a
              href="#product-architecture"
              className="whitespace-nowrap hover:text-blue-600 transition-colors"
            >
              {t.nav.architecture}
            </a>
            <a
              href="#pr-victory-engine"
              className="whitespace-nowrap hover:text-blue-600 transition-colors"
            >
              {t.nav.prEngine}
            </a>
            <Link
              href={`/p/${targetOrgSlug}`}
              className="whitespace-nowrap text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 font-bold"
            >
              <span>{t.nav.liveDemo}</span>
              <ExternalLink className="w-3 h-3 text-blue-500" />
            </Link>
            <a
              href="#case-study"
              className="whitespace-nowrap hover:text-blue-600 transition-colors"
            >
              {t.nav.impact}
            </a>
            <a
              href="#security"
              className="whitespace-nowrap hover:text-blue-600 transition-colors"
            >
              Data Sovereignty
            </a>
          </nav>

          {/* Actions: Compact Dropdown + Single-Line Book Demo + Single-Line Staff Login */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Multi-language Selector: Compact, clean single line */}
            <div className="relative flex items-center bg-slate-100 hover:bg-slate-200/70 rounded-lg px-2 py-1.5 border border-slate-200 transition-colors">
              <Globe2 className="w-3.5 h-3.5 text-slate-600 mr-1.5 shrink-0" />
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value as IndianLanguage)}
                aria-label="Select Indian Language"
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName}
                  </option>
                ))}
              </select>
            </div>

            {/* Book Demo: Strictly 1 line */}
            <a
              href="#demo-form"
              className="hidden sm:inline-flex items-center justify-center h-9 px-3.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs whitespace-nowrap"
            >
              {t.nav.bookDemo}
            </a>

            {/* Staff & Admin Login: Strictly 1 line */}
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs gap-1.5 whitespace-nowrap"
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>{t.nav.login}</span>
            </Link>

            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2">
            <a
              href="#product-architecture"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t.nav.architecture}
            </a>
            <a
              href="#pr-victory-engine"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t.nav.prEngine}
            </a>
            <Link
              href={`/p/${targetOrgSlug}`}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              <span>{t.nav.liveDemo} (Mangalagiri Portal)</span>
              <ExternalLink className="w-4 h-4" />
            </Link>
            <a
              href="#case-study"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t.nav.impact}
            </a>
            <a
              href="#security"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Data Sovereignty
            </a>
            <div className="pt-2 border-t border-slate-100 flex gap-2">
              <a
                href="#demo-form"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                {t.nav.bookDemo}
              </a>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 whitespace-nowrap"
              >
                {t.nav.login}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION (CLEAN, PROPORTIONAL, BALANCED)                            */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-24 border-b border-slate-200/70 bg-gradient-to-b from-blue-50/30 via-white to-[#FAF9F6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Top Pill: Single clean line */}
          <div className="flex justify-center mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                {t.badge}
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            </div>
          </div>

          {/* Hero Heading: Proportional, no awkward giant breaks */}
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.2]">
              {t.heroTitle1}{' '}
              <span className="text-blue-600 underline decoration-amber-400 decoration-wavy decoration-2">
                {t.heroTitleHighlight}
              </span>
            </h1>
            <p className="mt-4 text-sm sm:text-base lg:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              {t.heroSubtitle}
            </p>

            {/* CTAs: 1-line buttons */}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`/p/${targetOrgSlug}`}
                className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-blue-600 text-white font-semibold text-xs sm:text-sm hover:bg-blue-700 transition-all shadow-xs whitespace-nowrap active:scale-[0.98]"
              >
                <span>{t.ctaDemo}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setIsTourModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 transition-colors shadow-2xs whitespace-nowrap active:scale-[0.98]"
              >
                <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Play className="w-3 h-3 fill-amber-700 ml-0.5" />
                </div>
                <span>{t.ctaTour}</span>
              </button>
            </div>

            {/* Single-line Trust Row with dots */}
            <div className="mt-8 pt-5 border-t border-slate-200/60 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {t.trust.constituencies}
              </span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                {t.trust.sovereignty}
              </span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                {t.trust.whatsapp}
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. HERO LIVE WAR ROOM CARD (SHARP, SLEEK)                                  */}
          {/* ========================================================================= */}
          <div className="mt-10 sm:mt-12 bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-lg shadow-slate-200/50">
            {/* Header bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-100 bg-slate-50/80 p-3 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <span className="text-xs font-bold tracking-wider text-slate-800 uppercase whitespace-nowrap">
                  {t.deck.warRoom}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                  <Activity className="w-3 h-3" />
                  {t.deck.activeUnits}
                </span>
                <span className="text-xs text-slate-400 font-medium hidden sm:inline whitespace-nowrap">
                  {t.deck.syncLive}
                </span>
              </div>
            </div>

            {/* 3 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
              {/* Intake & GPS */}
              <div className="lg:col-span-4 bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 whitespace-nowrap">
                      {t.deck.liveStream}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-semibold whitespace-nowrap">
                      Ward #14
                    </span>
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 mt-2">
                    {t.deck.sampleIssue}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t.deck.sampleTicket}
                  </p>

                  <div className="mt-3.5 bg-white rounded-lg p-2.5 border border-slate-200 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-blue-600 font-semibold whitespace-nowrap">
                        <MapPin className="w-3.5 h-3.5" />
                        16.4819° N, 80.6083° E
                      </span>
                      <span className="text-emerald-600 font-bold whitespace-nowrap">
                        {t.deck.gpsVariance}
                      </span>
                    </div>
                    <div className="mt-1.5 bg-slate-100 rounded p-1.5 flex items-center justify-between text-xs font-medium text-slate-700">
                      <span className="whitespace-nowrap">{t.deck.volunteerLock}</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                  </div>

                  <div className="mt-3.5 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                      RS
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 leading-tight whitespace-nowrap">
                        {t.deck.volunteerName}
                      </p>
                      <p className="text-[10px] text-slate-500 whitespace-nowrap">
                        {t.deck.taskforceUnit}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-200/60">
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1 font-medium">
                    <span className="whitespace-nowrap">{t.deck.turnaroundMetric}</span>
                    <span className="text-emerald-700 font-bold whitespace-nowrap">{t.deck.timeRemaining}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full w-3/4 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Before & After Proof */}
              <div className="lg:col-span-4 bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 whitespace-nowrap">
                      Field Evidence Gate
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap">
                      AI Verified
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative rounded-lg overflow-hidden bg-slate-200 aspect-square border border-slate-300">
                      <img
                        src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=500&q=80"
                        alt="Before"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-bold">
                        {t.deck.beforeLabel}
                      </span>
                    </div>

                    <div className="relative rounded-lg overflow-hidden bg-slate-200 aspect-square border border-slate-300">
                      <img
                        src="https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=500&q=80"
                        alt="Resolved"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold">
                        {t.deck.resolvedLabel}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 bg-white p-2 rounded-lg border border-slate-200 text-xs">
                    <p className="font-semibold text-slate-800 text-[11px] truncate">{t.deck.auditSealed}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">{t.deck.approvedZonal}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    className="w-full h-9 rounded-lg bg-white border border-slate-300 text-blue-700 text-xs font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5 shadow-2xs whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t.deck.btnApprove}</span>
                  </button>
                </div>
              </div>

              {/* Auto 4:5 Poster */}
              <div className="lg:col-span-4 bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 whitespace-nowrap">
                      {t.deck.prChamber}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200 whitespace-nowrap">
                      {t.deck.autoPoster}
                    </span>
                  </div>

                  <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-2xs flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-slate-800 truncate">{t.deck.officialDispatch}</span>
                      <span className="text-emerald-700 font-bold whitespace-nowrap">{t.deck.recordTime}</span>
                    </div>

                    <div className="bg-blue-600 text-white rounded p-2 text-center">
                      <p className="font-bold text-[11px] leading-tight truncate">{t.deck.posterIssue}</p>
                      <p className="text-[9px] text-blue-100 mt-0.5 truncate">{t.deck.secretariatCell}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-1 rounded overflow-hidden">
                      <img
                        src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=300&q=80"
                        alt="Before"
                        className="h-12 w-full object-cover"
                      />
                      <img
                        src="https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=300&q=80"
                        alt="After"
                        className="h-12 w-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-1">
                  <button
                    type="button"
                    className="w-full h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs whitespace-nowrap"
                  >
                    <Send className="w-3 h-3" />
                    <span>{t.deck.btnBroadcast}</span>
                  </button>
                  <p className="text-center text-[9px] text-slate-400 font-medium truncate">
                    {t.deck.broadcastingNote}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. FIVE ENGINES (BENTO GRID - CLEAN, UNCLUTTERED)                         */}
      {/* ========================================================================= */}
      <section id="product-architecture" className="py-16 sm:py-20 bg-slate-50/70 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 whitespace-nowrap">
                {t.bento.sectionTag}
              </span>
              <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {t.bento.sectionTitle}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md">
              {t.bento.sectionSubtitle}
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-5">
            {/* Bento 1: Universal QR Poster */}
            <div className="md:col-span-6 lg:col-span-7 bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold whitespace-nowrap">
                    {t.bento.card1Badge}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {t.bento.card1Title}
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {t.bento.card1Desc}
                </p>

                <div className="mt-4 bg-slate-50 rounded-lg p-3 border border-slate-200 flex items-center gap-3">
                  <QrCode className="w-12 h-12 text-slate-800 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-slate-900">MANGALAGIRI SEVA CODE</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">Active across 1,480 locations. Auto-routes by ward.</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 text-xs font-semibold text-blue-700 flex items-center gap-1.5 whitespace-nowrap">
                <Zap className="w-3.5 h-3.5" />
                <span>{t.bento.card1Meta}</span>
              </div>
            </div>

            {/* Bento 2: Hyperlocal Landmark Geotagging */}
            <div className="md:col-span-6 lg:col-span-5 bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold whitespace-nowrap">
                    {t.bento.card2Badge}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {t.bento.card2Title}
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {t.bento.card2Desc}
                </p>

                <div className="mt-4 bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>Opp. Anjaneya Temple Water Tank</span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5 pl-5">Ward #07, Atmakur Village (3.4m accuracy)</p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 text-xs font-semibold text-amber-700 flex items-center gap-1.5 whitespace-nowrap">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{t.bento.card2Meta}</span>
              </div>
            </div>

            {/* Bento 3: Zero-Trust Geofencing */}
            <div className="md:col-span-6 lg:col-span-4 bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 whitespace-nowrap">
                    {t.bento.card3Badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{t.bento.card3Title}</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  {t.bento.card3Desc}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5 whitespace-nowrap">
                <Check className="w-3.5 h-3.5" />
                <span>{t.bento.card3Meta}</span>
              </div>
            </div>

            {/* Bento 4: Automated Victory Banners */}
            <div id="pr-victory-engine" className="md:col-span-6 lg:col-span-4 bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 whitespace-nowrap">
                    {t.bento.card4Badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{t.bento.card4Title}</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  {t.bento.card4Desc}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-blue-700 flex items-center gap-1.5 whitespace-nowrap">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t.bento.card4Meta}</span>
              </div>
            </div>

            {/* Bento 5: Omni-Channel Broadcasts */}
            <div className="md:col-span-6 lg:col-span-4 bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
                    <Send className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200 whitespace-nowrap">
                    {t.bento.card5Badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{t.bento.card5Title}</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  {t.bento.card5Desc}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-purple-700 flex items-center gap-1.5 whitespace-nowrap">
                <Radio className="w-3.5 h-3.5" />
                <span>{t.bento.card5Meta}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. CASE STUDY: MANGALAGIRI ASSEMBLY                                       */}
      {/* ========================================================================= */}
      <section id="case-study" className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-xs uppercase tracking-wider border border-blue-200 whitespace-nowrap">
              {t.caseStudy.tag}
            </span>
            <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              {t.caseStudy.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5">
              {t.caseStudy.subtitle}
            </p>
          </div>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
              <p className="text-2xl sm:text-3xl font-black text-blue-600 whitespace-nowrap">{t.caseStudy.stat1Val}</p>
              <p className="text-xs font-bold text-slate-800 mt-1 whitespace-nowrap">{t.caseStudy.stat1Label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">{t.caseStudy.stat1Sub}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 whitespace-nowrap">{t.caseStudy.stat2Val}</p>
              <p className="text-xs font-bold text-slate-800 mt-1 whitespace-nowrap">{t.caseStudy.stat2Label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">{t.caseStudy.stat2Sub}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
              <p className="text-2xl sm:text-3xl font-black text-amber-600 whitespace-nowrap">{t.caseStudy.stat3Val}</p>
              <p className="text-xs font-bold text-slate-800 mt-1 whitespace-nowrap">{t.caseStudy.stat3Label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">{t.caseStudy.stat3Sub}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
              <p className="text-2xl sm:text-3xl font-black text-blue-700 whitespace-nowrap">{t.caseStudy.stat4Val}</p>
              <p className="text-xs font-bold text-slate-800 mt-1 whitespace-nowrap">{t.caseStudy.stat4Label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">{t.caseStudy.stat4Sub}</p>
            </div>
          </div>

          {/* Testimonial Quote */}
          <div className="bg-slate-50 rounded-xl p-5 sm:p-8 border border-slate-200">
            <p className="text-sm sm:text-base font-medium text-slate-800 italic leading-relaxed">
              {t.caseStudy.quote}
            </p>
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-200/60 pt-3">
              <div>
                <p className="text-xs font-bold text-slate-900 whitespace-nowrap">{t.caseStudy.quoteAuthor}</p>
                <p className="text-[11px] text-slate-500 whitespace-nowrap">{t.caseStudy.quoteRole}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                  {t.caseStudy.pill1}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                  {t.caseStudy.pill2}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                  {t.caseStudy.pill3}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. DATA SOVEREIGNTY & ECI COMPLIANCE                                      */}
      {/* ========================================================================= */}
      <section id="security" className="py-16 sm:py-20 bg-slate-50/70 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 whitespace-nowrap">
              {t.security.tag}
            </span>
            <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              {t.security.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5">
              {t.security.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 whitespace-nowrap">{t.security.feat1Title}</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {t.security.feat1Desc}
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 whitespace-nowrap">{t.security.feat2Title}</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {t.security.feat2Desc}
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 whitespace-nowrap">{t.security.feat3Title}</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {t.security.feat3Desc}
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                <PhoneCall className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 whitespace-nowrap">{t.security.feat4Title}</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {t.security.feat4Desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. CONTACT / BRIEFING BOOKING (CLEAN FORM)                                */}
      {/* ========================================================================= */}
      <section id="demo-form" className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-blue-600 text-white rounded-2xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              <div className="lg:col-span-6">
                <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-white text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                  {t.booking.tag}
                </span>
                <h2 className="text-xl sm:text-3xl font-extrabold text-white mt-3 leading-snug">
                  {t.booking.title}
                </h2>
                <p className="text-xs sm:text-sm text-blue-100 mt-2 leading-relaxed">
                  {t.booking.subtitle}
                </p>

                <div className="mt-5 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>{t.booking.bullet1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>{t.booking.bullet2}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>{t.booking.bullet3}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-blue-500/50 flex flex-wrap items-center gap-3 text-xs text-blue-100">
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <Phone className="w-3.5 h-3.5 text-emerald-300" />
                    <span className="font-semibold">{t.footer.tollFree}</span>
                  </div>
                  <span>•</span>
                  <span className="whitespace-nowrap">{t.footer.email}</span>
                </div>
              </div>

              {/* Form */}
              <div className="lg:col-span-6 bg-white text-slate-900 rounded-xl p-5 sm:p-6 shadow-md">
                {!briefingSubmitted ? (
                  <>
                    <h3 className="text-base font-bold text-slate-900 whitespace-nowrap">
                      {t.booking.formTitle}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t.booking.formSub}
                    </p>

                    <form onSubmit={handleBookingSubmit} className="mt-4 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                            {t.booking.repNameLabel} *
                          </label>
                          <input
                            type="text"
                            required
                            value={repName}
                            onChange={(e) => setRepName(e.target.value)}
                            placeholder={t.booking.repNamePlaceholder}
                            className="w-full h-9 px-3 rounded-md bg-slate-50 border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                            {t.booking.roleLabel}
                          </label>
                          <select
                            value={repRole}
                            onChange={(e) => setRepRole(e.target.value)}
                            className="w-full h-9 px-3 rounded-md bg-slate-50 border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                          >
                            <option>Sitting MLA</option>
                            <option>Member of Parliament (MP)</option>
                            <option>Mayor / Municipal Chairperson</option>
                            <option>Chief of Staff / Secretariat</option>
                            <option>Campaign Strategy Lead</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                            {t.booking.seatLabel} *
                          </label>
                          <input
                            type="text"
                            required
                            value={repSeat}
                            onChange={(e) => setRepSeat(e.target.value)}
                            placeholder={t.booking.seatPlaceholder}
                            className="w-full h-9 px-3 rounded-md bg-slate-50 border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                            {t.booking.phoneLabel} *
                          </label>
                          <input
                            type="tel"
                            required
                            value={repPhone}
                            onChange={(e) => setRepPhone(e.target.value)}
                            placeholder={t.booking.phonePlaceholder}
                            className="w-full h-9 px-3 rounded-md bg-slate-50 border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                          {t.booking.briefingFormatLabel}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="flex items-center gap-1.5 p-2 rounded-md bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 text-xs text-slate-700">
                            <input
                              type="radio"
                              name="briefing_format"
                              checked={briefingFormat === 'virtual'}
                              onChange={() => setBriefingFormat('virtual')}
                              className="text-blue-600"
                            />
                            <span className="whitespace-nowrap">{t.booking.virtualFormat}</span>
                          </label>
                          <label className="flex items-center gap-1.5 p-2 rounded-md bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 text-xs text-slate-700">
                            <input
                              type="radio"
                              name="briefing_format"
                              checked={briefingFormat === 'in_person'}
                              onChange={() => setBriefingFormat('in_person')}
                              className="text-blue-600"
                            />
                            <span className="whitespace-nowrap">{t.booking.inPersonFormat}</span>
                          </label>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        <span>{t.booking.btnSubmit}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <p className="text-center text-[10px] text-slate-400 font-medium">
                        {t.booking.ndaNote}
                      </p>
                    </form>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900">
                      {t.booking.successTitle}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {t.booking.successSub}
                    </p>
                    <button
                      type="button"
                      onClick={() => setBriefingSubmitted(false)}
                      className="mt-4 px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors whitespace-nowrap"
                    >
                      Book Another Briefing
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. TOUR MODAL                                                             */}
      {/* ========================================================================= */}
      {isTourModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-4 sm:p-5 shadow-2xl relative border border-slate-200">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-blue-600 fill-blue-600" />
                <span className="font-bold text-slate-900 text-sm whitespace-nowrap">
                  {t.tourModal.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsTourModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="aspect-video w-full rounded-lg overflow-hidden bg-slate-900 relative flex items-center justify-center">
              <img
                src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80"
                alt="Product overview deck"
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer">
                  <Play className="w-5 h-5 fill-white ml-0.5" />
                </div>
                <p className="font-bold text-sm sm:text-base mt-2.5">{t.tourModal.sub}</p>
                <span className="text-[11px] text-white/80">Available in Telugu, Hindi & English</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span className="whitespace-nowrap">{t.tourModal.speaker}</span>
              <span className="whitespace-nowrap">{t.tourModal.duration}</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. FOOTER (CLEAN & MINIMALIST)                                            */}
      {/* ========================================================================= */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 pb-8 border-b border-slate-200">
            <div className="lg:col-span-2 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="font-bold text-base text-slate-900 whitespace-nowrap">Praja Seva</span>
              </div>
              <p className="text-xs text-slate-600 max-w-sm leading-relaxed">
                {t.footer.desc}
              </p>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <h4 className="font-bold text-slate-900 whitespace-nowrap">{t.footer.archTitle}</h4>
              <a href="#product-architecture" className="text-slate-600 hover:text-blue-600 transition-colors whitespace-nowrap">
                Universal QR Engine
              </a>
              <a href="#pr-victory-engine" className="text-slate-600 hover:text-blue-600 transition-colors whitespace-nowrap">
                PR Victory Engine
              </a>
              <Link href={`/p/${targetOrgSlug}`} className="text-slate-600 hover:text-blue-600 transition-colors whitespace-nowrap">
                Citizen Portal
              </Link>
              <Link href={`/m/${targetOrgSlug}`} className="text-slate-600 hover:text-blue-600 transition-colors whitespace-nowrap">
                Operations Board
              </Link>
            </div>

            <div className="flex flex-col gap-1.5 text-xs">
              <h4 className="font-bold text-slate-900 whitespace-nowrap">{t.footer.hubsTitle}</h4>
              <p className="text-slate-600"><strong className="text-slate-800">Amaravati:</strong> Tech Park, AP 522503</p>
              <p className="text-slate-600"><strong className="text-slate-800">Hyderabad:</strong> HITEC City, TS 500081</p>
              <p className="text-slate-600"><strong className="text-slate-800">New Delhi:</strong> Connaught Place, ND 110001</p>
            </div>

            <div className="flex flex-col gap-1.5 text-xs">
              <h4 className="font-bold text-slate-900 whitespace-nowrap">{t.footer.helplineTitle}</h4>
              <a href="tel:18005992484" className="font-bold text-blue-600 hover:underline whitespace-nowrap">
                {t.footer.tollFree}
              </a>
              <a href="mailto:secretariat@prajaseva.govtech.in" className="text-slate-600 hover:underline whitespace-nowrap">
                {t.footer.email}
              </a>
            </div>
          </div>

          <div className="pt-5 pb-4 border-b border-slate-100">
            <PwaInstallButton lang={selectedLang} />
          </div>

          <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <p className="whitespace-nowrap">{t.footer.copyright}</p>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-slate-800 whitespace-nowrap">{t.footer.privacy}</a>
              <a href="#" className="hover:text-slate-800 whitespace-nowrap">{t.footer.eciCompliance}</a>
              <a href="#" className="hover:text-slate-800 whitespace-nowrap">{t.footer.terms}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
