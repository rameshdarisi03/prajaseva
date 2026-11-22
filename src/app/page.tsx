'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
  Camera,
  Share2,
  Sparkles,
  Users,
  Send,
  Lock,
  ChevronDown,
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
      {/* 1. TOP HEADER NAVIGATION (WORLD STANDARD)                                  */}
      {/* ========================================================================= */}
      <header className="sticky top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg sm:text-xl tracking-tight text-slate-900 flex items-center gap-1.5">
                  Praja Seva
                  <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                    GovTech OS
                  </span>
                </span>
                <span className="text-[11px] font-medium text-slate-500 tracking-wider uppercase">
                  Constituency Redressal & PR
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#product-architecture" className="hover:text-blue-600 transition-colors">
              {t.nav.architecture}
            </a>
            <a href="#pr-victory-engine" className="hover:text-blue-600 transition-colors">
              {t.nav.prEngine}
            </a>
            <Link href={`/p/${targetOrgSlug}`} className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <span>{t.nav.liveDemo}</span>
              <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
            </Link>
            <a href="#case-study" className="hover:text-blue-600 transition-colors">
              {t.nav.impact}
            </a>
            <a href="#security" className="hover:text-blue-600 transition-colors">
              Data Sovereignty
            </a>
          </nav>

          {/* Actions: Multi-language selector + Contact Us + Login */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Multi-language Selector covering all major Indian languages */}
            <div className="relative flex items-center bg-slate-100 hover:bg-slate-200/80 rounded-lg px-2.5 py-1.5 border border-slate-200 transition-colors">
              <Globe2 className="w-4 h-4 text-slate-600 mr-1.5 shrink-0" />
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value as IndianLanguage)}
                aria-label="Select Indian Language"
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Contact Us / Book Demo */}
            <a
              href="#demo-form"
              className="hidden sm:inline-flex items-center justify-center h-10 px-4 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
            >
              {t.nav.bookDemo}
            </a>

            {/* Staff & Admin Login */}
            <Link
              href={`/m/${targetOrgSlug}`}
              className="inline-flex items-center justify-center h-10 px-3.5 sm:px-4 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              <span>{t.nav.login}</span>
            </Link>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2.5">
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
                className="flex-1 text-center py-2.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t.nav.bookDemo}
              </a>
              <Link
                href={`/m/${targetOrgSlug}`}
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
              >
                {t.nav.login}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION                                                           */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-28 border-b border-slate-200/60 bg-gradient-to-b from-blue-50/40 via-white to-[#FAF9F6]">
        {/* Soft atmospheric radial gradients */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-amber-200/25 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Top Live Pill */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-semibold text-slate-800 tracking-wide">
                {t.badge}
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            </div>
          </div>

          {/* Hero Headings */}
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
              {t.heroTitle1}{' '}
              <span className="text-blue-600 underline decoration-amber-400 decoration-wavy decoration-2">
                {t.heroTitleHighlight}
              </span>
            </h1>
            <p className="mt-5 text-base sm:text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              {t.heroSubtitle}
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">
              <Link
                href={`/p/${targetOrgSlug}`}
                className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-blue-600 text-white font-semibold text-sm sm:text-base hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 active:scale-[0.98]"
              >
                <span>{t.ctaDemo}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={() => setIsTourModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm sm:text-base hover:bg-slate-50 transition-colors shadow-xs active:scale-[0.98]"
              >
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Play className="w-3.5 h-3.5 fill-amber-700 ml-0.5" />
                </div>
                <span>{t.ctaTour}</span>
              </button>
            </div>

            {/* Trust Metrics Bar */}
            <div className="mt-10 pt-6 border-t border-slate-200/60 flex flex-wrap items-center justify-center gap-y-3 gap-x-8 text-xs sm:text-sm font-medium text-slate-600">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{t.trust.constituencies}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-blue-600" />
                <span>{t.trust.sovereignty}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{t.trust.whatsapp}</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. HERO INTERACTIVE COMMAND DECK PREVIEW (MANGALAGIRI WAR ROOM)           */}
          {/* ========================================================================= */}
          <div className="mt-12 lg:mt-16 bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 lg:p-8 shadow-xl shadow-slate-200/50">
            {/* Command Bar Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 mb-6 border-b border-slate-100 bg-slate-50/70 p-3.5 rounded-xl">
              <div className="flex items-center gap-2.5">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <span className="text-xs sm:text-sm font-bold tracking-wider text-slate-800 uppercase">
                  {t.deck.warRoom}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Activity className="w-3.5 h-3.5" />
                  {t.deck.activeUnits}
                </span>
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                  {t.deck.syncLive}
                </span>
              </div>
            </div>

            {/* 3 Interactive Showcase Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
              {/* Left Column: Live Intake Stream & GPS Triage */}
              <div className="lg:col-span-4 bg-slate-50 rounded-xl p-5 border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                      {t.deck.liveStream}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                      Ward #14
                    </span>
                  </div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900 mt-2">
                    {t.deck.sampleIssue}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {t.deck.sampleTicket}
                  </p>

                  {/* GPS Card */}
                  <div className="mt-4 bg-white rounded-lg p-3 border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-blue-600 font-semibold">
                        <MapPin className="w-3.5 h-3.5" />
                        16.4819° N, 80.6083° E
                      </span>
                      <span className="text-emerald-600 font-bold">
                        {t.deck.gpsVariance}
                      </span>
                    </div>
                    <div className="mt-2 bg-slate-100 rounded p-2 flex items-center justify-between text-xs font-medium text-slate-700">
                      <span>{t.deck.volunteerLock}</span>
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                  </div>

                  {/* Assigned Volunteer */}
                  <div className="mt-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                      RS
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 leading-tight">
                        {t.deck.volunteerName}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {t.deck.taskforceUnit}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-200/60">
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5 font-medium">
                    <span>{t.deck.turnaroundMetric}</span>
                    <span className="text-emerald-700 font-bold">{t.deck.timeRemaining}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full w-3/4 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Center Column: Visual Before & After Proof */}
              <div className="lg:col-span-4 bg-slate-50 rounded-xl p-5 border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                      Field Evidence Gate
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      AI Verified Silt Cleared
                    </span>
                  </div>

                  {/* Side-by-Side Photos */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative rounded-lg overflow-hidden bg-slate-200 aspect-square border border-slate-300">
                      <img
                        src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=500&q=80"
                        alt="Before drainage issue"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold">
                        {t.deck.beforeLabel}
                      </span>
                      <span className="absolute bottom-1.5 left-1.5 text-[9px] text-white bg-black/70 px-1 rounded backdrop-blur-xs">
                        09:15 AM IST
                      </span>
                    </div>

                    <div className="relative rounded-lg overflow-hidden bg-slate-200 aspect-square border border-slate-300">
                      <img
                        src="https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=500&q=80"
                        alt="Resolved cleared street canal"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold">
                        {t.deck.resolvedLabel}
                      </span>
                      <span className="absolute bottom-1.5 left-1.5 text-[9px] text-white bg-black/70 px-1 rounded backdrop-blur-xs">
                        12:45 PM IST
                      </span>
                    </div>
                  </div>

                  {/* Hash & Approval */}
                  <div className="mt-3 bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                    <p className="font-semibold text-slate-800">{t.deck.auditSealed}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{t.deck.approvedZonal}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    className="w-full h-11 rounded-lg bg-white border border-slate-300 text-blue-700 text-xs font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{t.deck.btnApprove}</span>
                  </button>
                </div>
              </div>

              {/* Right Column: 4:5 Social Victory PR Poster Card */}
              <div className="lg:col-span-4 bg-slate-50 rounded-xl p-5 border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                      {t.deck.prChamber}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200">
                      {t.deck.autoPoster}
                    </span>
                  </div>

                  {/* 4:5 Simulated Social Victory Card */}
                  <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                        <span className="font-bold text-slate-800">{t.deck.officialDispatch}</span>
                      </div>
                      <span className="text-emerald-700 font-bold">{t.deck.recordTime}</span>
                    </div>

                    <div className="bg-blue-600 text-white rounded-lg p-2.5 text-center">
                      <p className="font-bold text-xs leading-snug">{t.deck.posterIssue}</p>
                      <p className="text-[10px] text-blue-100 mt-0.5">{t.deck.secretariatCell}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-1 rounded overflow-hidden">
                      <img
                        src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=300&q=80"
                        alt="Before"
                        className="h-16 w-full object-cover"
                      />
                      <img
                        src="https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=300&q=80"
                        alt="After"
                        className="h-16 w-full object-cover"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-600 pt-0.5">
                      <span>Citizen: K. Venkatesh Babu</span>
                      <span className="text-blue-700 font-bold">Ward 14 • Mangalagiri</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-1.5">
                  <button
                    type="button"
                    className="w-full h-11 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{t.deck.btnBroadcast}</span>
                  </button>
                  <p className="text-center text-[10px] text-slate-500 font-medium">
                    {t.deck.broadcastingNote}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. BENTO GRID: FIVE CORE ENGINES                                          */}
      {/* ========================================================================= */}
      <section id="product-architecture" className="py-20 bg-slate-50/70 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                {t.bento.sectionTag}
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mt-2">
                {t.bento.sectionTitle}
              </h2>
            </div>
            <p className="text-sm sm:text-base text-slate-600 max-w-md">
              {t.bento.sectionSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6">
            {/* Bento 1: Universal QR Poster (Col 7) */}
            <div className="md:col-span-6 lg:col-span-7 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                    {t.bento.card1Badge}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  {t.bento.card1Title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {t.bento.card1Desc}
                </p>

                {/* QR Mockup visual */}
                <div className="mt-5 bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-20 h-20 bg-white rounded-lg p-1.5 flex items-center justify-center border border-slate-300 shrink-0">
                    <QrCode className="w-16 h-16 text-slate-900" />
                  </div>
                  <div className="text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">MANGALAGIRI SEVA CODE</span>
                      <span className="text-emerald-700 font-semibold">Active: 1,480 Locations</span>
                    </div>
                    <p className="text-slate-500 mt-1">
                      Constituents tap or scan from any mobile camera. Auto-routes by ward with zero app installs.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-blue-700 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>{t.bento.card1Meta}</span>
              </div>
            </div>

            {/* Bento 2: Hyperlocal Landmark Geotagging (Col 5) */}
            <div className="md:col-span-6 lg:col-span-5 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                    {t.bento.card2Badge}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  {t.bento.card2Title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {t.bento.card2Desc}
                </p>

                <div className="mt-5 bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs">
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Opp. Anjaneya Temple Water Tank</span>
                  </div>
                  <p className="text-slate-500 mt-1 pl-6">
                    Accurate to 3.4 meters • Ward #07, Atmakur Village
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-amber-700 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>{t.bento.card2Meta}</span>
              </div>
            </div>

            {/* Bento 3: Zero-Trust Geofencing (Col 4) */}
            <div className="md:col-span-6 lg:col-span-4 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                    {t.bento.card3Badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{t.bento.card3Title}</h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {t.bento.card3Desc}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>{t.bento.card3Meta}</span>
              </div>
            </div>

            {/* Bento 4: Automated Victory Banners (Col 4) */}
            <div id="pr-victory-engine" className="md:col-span-6 lg:col-span-4 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                    {t.bento.card4Badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{t.bento.card4Title}</h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {t.bento.card4Desc}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] font-semibold text-blue-700 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5" />
                <span>{t.bento.card4Meta}</span>
              </div>
            </div>

            {/* Bento 5: Omni-Channel Broadcasts (Col 4) */}
            <div className="md:col-span-6 lg:col-span-4 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
                    <Send className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
                    {t.bento.card5Badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{t.bento.card5Title}</h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {t.bento.card5Desc}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] font-semibold text-purple-700 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" />
                <span>{t.bento.card5Meta}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. FLAGSHIP CASE STUDY: MANGALAGIRI ASSEMBLY                               */}
      {/* ========================================================================= */}
      <section id="case-study" className="py-20 sm:py-28 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs uppercase tracking-wider border border-blue-200">
              {t.caseStudy.tag}
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mt-3">
              {t.caseStudy.title}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2">
              {t.caseStudy.subtitle}
            </p>
          </div>

          {/* 4 Impact Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-14">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-center">
              <p className="text-3xl sm:text-4xl font-black text-blue-600">{t.caseStudy.stat1Val}</p>
              <p className="text-sm font-bold text-slate-800 mt-1.5">{t.caseStudy.stat1Label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t.caseStudy.stat1Sub}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-center">
              <p className="text-3xl sm:text-4xl font-black text-emerald-600">{t.caseStudy.stat2Val}</p>
              <p className="text-sm font-bold text-slate-800 mt-1.5">{t.caseStudy.stat2Label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t.caseStudy.stat2Sub}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-center">
              <p className="text-3xl sm:text-4xl font-black text-amber-600">{t.caseStudy.stat3Val}</p>
              <p className="text-sm font-bold text-slate-800 mt-1.5">{t.caseStudy.stat3Label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t.caseStudy.stat3Sub}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-center">
              <p className="text-3xl sm:text-4xl font-black text-blue-700">{t.caseStudy.stat4Val}</p>
              <p className="text-sm font-bold text-slate-800 mt-1.5">{t.caseStudy.stat4Label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t.caseStudy.stat4Sub}</p>
            </div>
          </div>

          {/* Testimonial Quote & Case Study Card */}
          <div className="bg-slate-50 rounded-2xl p-6 sm:p-10 border border-slate-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 relative">
                <div className="rounded-xl overflow-hidden aspect-[4/3] bg-slate-200 shadow-md border border-slate-300">
                  <img
                    src="https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?auto=format&fit=crop&w=800&q=80"
                    alt="Civic meeting and ground governance"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-3 -right-3 bg-blue-600 text-white px-3.5 py-1.5 rounded-lg shadow-md text-xs font-bold flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" />
                  <span>Mangalagiri Assembly Model</span>
                </div>
              </div>

              <div className="lg:col-span-7 flex flex-col justify-center">
                <p className="text-base sm:text-lg lg:text-xl font-medium text-slate-800 italic leading-relaxed">
                  {t.caseStudy.quote}
                </p>
                <div className="mt-5">
                  <p className="text-sm font-bold text-slate-900">{t.caseStudy.quoteAuthor}</p>
                  <p className="text-xs text-slate-500">{t.caseStudy.quoteRole}</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-xs">
                    {t.caseStudy.pill1}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-xs">
                    {t.caseStudy.pill2}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-xs">
                    {t.caseStudy.pill3}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. DATA SOVEREIGNTY & ECI COMPLIANCE DEEP-DIVE                            */}
      {/* ========================================================================= */}
      <section id="security" className="py-20 bg-slate-50/70 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              {t.security.tag}
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mt-2">
              {t.security.title}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2">
              {t.security.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{t.security.feat1Title}</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                {t.security.feat1Desc}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{t.security.feat2Title}</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                {t.security.feat2Desc}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{t.security.feat3Title}</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                {t.security.feat3Desc}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                <PhoneCall className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{t.security.feat4Title}</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                {t.security.feat4Desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. CONTACT US & PRIVATE LEGISLATIVE BRIEFING BOOKING                     */}
      {/* ========================================================================= */}
      <section id="demo-form" className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-blue-600 text-white rounded-3xl p-6 sm:p-10 lg:p-14 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-blue-400 rounded-full blur-3xl opacity-40 pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
              {/* Left Column: Value Prop */}
              <div className="lg:col-span-6">
                <span className="px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold uppercase tracking-wider">
                  {t.booking.tag}
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-4 leading-tight">
                  {t.booking.title}
                </h2>
                <p className="text-sm sm:text-base text-blue-100 mt-3 leading-relaxed">
                  {t.booking.subtitle}
                </p>

                <div className="mt-6 space-y-3 text-xs sm:text-sm">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
                    <span>{t.booking.bullet1}</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
                    <span>{t.booking.bullet2}</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
                    <span>{t.booking.bullet3}</span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-blue-500/50 flex items-center gap-4 text-xs text-blue-100">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-emerald-300" />
                    <span className="font-semibold">{t.footer.tollFree}</span>
                  </div>
                  <span>•</span>
                  <span>{t.footer.email}</span>
                </div>
              </div>

              {/* Right Column: Interactive Booking Form */}
              <div className="lg:col-span-6 bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-xl">
                {!briefingSubmitted ? (
                  <>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                      {t.booking.formTitle}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {t.booking.formSub}
                    </p>

                    <form onSubmit={handleBookingSubmit} className="mt-5 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            {t.booking.repNameLabel} *
                          </label>
                          <input
                            type="text"
                            required
                            value={repName}
                            onChange={(e) => setRepName(e.target.value)}
                            placeholder={t.booking.repNamePlaceholder}
                            className="w-full h-11 px-3.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            {t.booking.roleLabel}
                          </label>
                          <select
                            value={repRole}
                            onChange={(e) => setRepRole(e.target.value)}
                            className="w-full h-11 px-3.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                          >
                            <option>Sitting MLA</option>
                            <option>Member of Parliament (MP)</option>
                            <option>Mayor / Municipal Chairperson</option>
                            <option>Chief of Staff / Secretariat</option>
                            <option>Campaign Strategy Lead</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            {t.booking.seatLabel} *
                          </label>
                          <input
                            type="text"
                            required
                            value={repSeat}
                            onChange={(e) => setRepSeat(e.target.value)}
                            placeholder={t.booking.seatPlaceholder}
                            className="w-full h-11 px-3.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            {t.booking.phoneLabel} *
                          </label>
                          <input
                            type="tel"
                            required
                            value={repPhone}
                            onChange={(e) => setRepPhone(e.target.value)}
                            placeholder={t.booking.phonePlaceholder}
                            className="w-full h-11 px-3.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {t.booking.briefingFormatLabel}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 text-xs font-medium text-slate-700">
                            <input
                              type="radio"
                              name="briefing_format"
                              checked={briefingFormat === 'virtual'}
                              onChange={() => setBriefingFormat('virtual')}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            <span>{t.booking.virtualFormat}</span>
                          </label>
                          <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 text-xs font-medium text-slate-700">
                            <input
                              type="radio"
                              name="briefing_format"
                              checked={briefingFormat === 'in_person'}
                              onChange={() => setBriefingFormat('in_person')}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            <span>{t.booking.inPersonFormat}</span>
                          </label>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition-colors shadow-md shadow-blue-600/20 flex items-center justify-center gap-2"
                      >
                        <span>{t.booking.btnSubmit}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <p className="text-center text-[11px] text-slate-500 font-medium">
                        {t.booking.ndaNote}
                      </p>
                    </form>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="text-xl font-bold text-slate-900">
                      {t.booking.successTitle}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-sm mx-auto leading-relaxed">
                      {t.booking.successSub}
                    </p>
                    <button
                      type="button"
                      onClick={() => setBriefingSubmitted(false)}
                      className="mt-6 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
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
      {/* 8. 2-MINUTE TOUR POPUP MODAL                                              */}
      {/* ========================================================================= */}
      {isTourModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl relative border border-slate-200">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-blue-600 fill-blue-600" />
                <span className="font-bold text-slate-900 text-sm sm:text-base">
                  {t.tourModal.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsTourModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-900 relative flex items-center justify-center">
              <img
                src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80"
                alt="Product overview deck"
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
                <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer">
                  <Play className="w-7 h-7 fill-white ml-1" />
                </div>
                <p className="font-bold text-base sm:text-lg mt-3">{t.tourModal.sub}</p>
                <span className="text-xs text-white/80">Available in Telugu, Hindi & English</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>{t.tourModal.speaker}</span>
              <span>{t.tourModal.duration}</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. FOOTER                                                                 */}
      {/* ========================================================================= */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-slate-200">
            {/* Brand column */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="font-bold text-lg text-slate-900">Praja Seva</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 max-w-sm leading-relaxed">
                {t.footer.desc}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] font-semibold text-slate-600">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {t.footer.cert1}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  {t.footer.cert2}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  {t.footer.cert3}
                </span>
              </div>
            </div>

            {/* Architecture Links */}
            <div className="flex flex-col gap-2.5 text-xs sm:text-sm">
              <h4 className="font-bold text-slate-900">{t.footer.archTitle}</h4>
              <a href="#product-architecture" className="text-slate-600 hover:text-blue-600 transition-colors">
                Universal QR Engine
              </a>
              <a href="#pr-victory-engine" className="text-slate-600 hover:text-blue-600 transition-colors">
                PR Victory Engine
              </a>
              <Link href={`/p/${targetOrgSlug}`} className="text-slate-600 hover:text-blue-600 transition-colors">
                Citizen Portal
              </Link>
              <Link href={`/m/${targetOrgSlug}`} className="text-slate-600 hover:text-blue-600 transition-colors">
                Operations Board
              </Link>
            </div>

            {/* Hubs */}
            <div className="flex flex-col gap-2.5 text-xs">
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{t.footer.hubsTitle}</h4>
              <div>
                <p className="font-bold text-slate-800">Amaravati</p>
                <p className="text-slate-500">Tech Park, Mangalagiri Core, AP 522503</p>
              </div>
              <div>
                <p className="font-bold text-slate-800">Hyderabad</p>
                <p className="text-slate-500">Jubilee Enclave, HITEC City, TS 500081</p>
              </div>
              <div>
                <p className="font-bold text-slate-800">New Delhi</p>
                <p className="text-slate-500">Constituency Tech Bhavan, ND 110001</p>
              </div>
            </div>

            {/* Helpline */}
            <div className="flex flex-col gap-2.5 text-xs sm:text-sm">
              <h4 className="font-bold text-slate-900">{t.footer.helplineTitle}</h4>
              <p className="text-slate-500 text-xs">
                Direct onboarding line for legislative secretariats:
              </p>
              <a href="tel:18005992484" className="font-bold text-blue-600 hover:underline text-sm">
                {t.footer.tollFree}
              </a>
              <a href="mailto:secretariat@prajaseva.govtech.in" className="text-slate-600 hover:underline text-xs">
                {t.footer.email}
              </a>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <p>{t.footer.copyright}</p>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-slate-800">{t.footer.privacy}</a>
              <a href="#" className="hover:text-slate-800">{t.footer.eciCompliance}</a>
              <a href="#" className="hover:text-slate-800">{t.footer.terms}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
