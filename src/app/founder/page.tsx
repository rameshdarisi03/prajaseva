'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Crown,
  Building2,
  Plus,
  MessageSquare,
  Globe,
  Users,
  MapPin,
  FileCheck2,
  ExternalLink,
  LogOut,
  Lock,
  ChevronRight,
  Sliders,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface OrganizationItem {
  id: string;
  name: string;
  slug: string;
  custom_domain?: string | null;
  founder_phone: string;
  mla_name: string;
  mla_designation?: string;
  party_name?: string | null;
  party_primary_color?: string;
  party_secondary_color?: string;
  constituency_slogan?: string;
  whatsapp_group_mla?: string | null;
  whatsapp_group_town?: string | null;
  infrastructure_mode?: 'SHARED' | 'DEDICATED_BYOK';
  stats?: {
    staffCount: number;
    wardCount: number;
    complaintCount: number;
    resolvedCount: number;
  };
}

const TRANQUIL_GRADIENT = 'linear-gradient(135deg, #EECDA3 0%, #EF629F 100%)';

export default function FounderPortalPage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  // Auth Gate State
  const [phone, setPhone] = useState('');
  const [otpStep, setOtpStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [otpCode, setOtpCode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Portal Data
  const [orgs, setOrgs] = useState<OrganizationItem[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  // Enroll / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrganizationItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [mlaName, setMlaName] = useState('');
  const [mlaDesignation, setMlaDesignation] = useState('Member of Legislative Assembly (MLA)');
  const [founderPhone, setFounderPhone] = useState('');
  const [adminName, setAdminName] = useState('');
  const [partyName, setPartyName] = useState('');
  const [partyPrimaryColor, setPartyPrimaryColor] = useState('#16A34A');
  const [partySecondaryColor, setPartySecondaryColor] = useState('#F59E0B');
  const [constituencySlogan, setConstituencySlogan] = useState('ప్రజల కోసం... ప్రజా సేవలో...');
  const [customDomain, setCustomDomain] = useState('');
  const [initialWardCount, setInitialWardCount] = useState(5);
  const [whatsappGroupMla, setWhatsappGroupMla] = useState('');
  const [whatsappGroupTown, setWhatsappGroupTown] = useState('');

  const fetchOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      const res = await fetch('/api/founder/organizations');
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }
      const data = await res.json();
      if (data.organizations) {
        setOrgs(data.organizations);
      }
    } catch (e) {
      console.error('Failed to load organizations:', e);
    } finally {
      setLoadingOrgs(false);
    }
  };

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/founder/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check_session' }),
        });
        if (res.ok) {
          setAuthenticated(true);
          fetchOrganizations();
        }
      } catch {}
      setCheckingAuth(false);
    }
    checkSession();
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const res = await fetch('/api/founder/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_otp', phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      setOtpStep('OTP');
      setOtpCode('');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const res = await fetch('/api/founder/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_otp', phone, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setAuthenticated(true);
      fetchOrganizations();
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/founder/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    setAuthenticated(false);
    setOtpStep('PHONE');
    setOtpCode('');
  };

  const openEnrollModal = () => {
    setEditingOrg(null);
    setFormError(null);
    setFormSuccess(null);
    setName('');
    setSlug('');
    setMlaName('');
    setMlaDesignation('Member of Legislative Assembly (MLA)');
    setFounderPhone('');
    setAdminName('');
    setPartyName('');
    setPartyPrimaryColor('#16A34A');
    setPartySecondaryColor('#F59E0B');
    setConstituencySlogan('ప్రజల కోసం... ప్రజా సేవలో...');
    setCustomDomain('');
    setInitialWardCount(5);
    setWhatsappGroupMla('');
    setWhatsappGroupTown('');
    setModalOpen(true);
  };

  const openEditModal = (org: OrganizationItem) => {
    setEditingOrg(org);
    setFormError(null);
    setFormSuccess(null);
    setName(org.name);
    setSlug(org.slug);
    setMlaName(org.mla_name);
    setMlaDesignation(org.mla_designation || 'Member of Legislative Assembly (MLA)');
    setFounderPhone(org.founder_phone);
    setAdminName('');
    setPartyName(org.party_name || '');
    setPartyPrimaryColor(org.party_primary_color || '#16A34A');
    setPartySecondaryColor(org.party_secondary_color || '#F59E0B');
    setConstituencySlogan(org.constituency_slogan || '');
    setCustomDomain(org.custom_domain || '');
    setWhatsappGroupMla(org.whatsapp_group_mla || '');
    setWhatsappGroupTown(org.whatsapp_group_town || '');
    setModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingOrg) {
      const auto = val
        .toLowerCase()
        .replace(/assembly|constituency/gi, '')
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setSlug(auto ? `org_${auto}` : '');
    }
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSaving(true);

    try {
      const method = editingOrg ? 'PATCH' : 'POST';
      const payload = editingOrg
        ? {
            id: editingOrg.id,
            name,
            customDomain,
            mlaName,
            mlaDesignation,
            partyName,
            partyPrimaryColor,
            partySecondaryColor,
            constituencySlogan,
            whatsappGroupMla,
            whatsappGroupTown,
          }
        : {
            name,
            slug,
            founderPhone,
            adminName,
            mlaName,
            mlaDesignation,
            partyName,
            partyPrimaryColor,
            partySecondaryColor,
            constituencySlogan,
            customDomain,
            whatsappGroupMla,
            whatsappGroupTown,
            initialWardCount,
          };

      const res = await fetch('/api/founder/organizations', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save constituency');

      setFormSuccess(
        editingOrg
          ? 'Constituency BYOK & branding configuration updated.'
          : 'New constituency enrolled! Primary Admin added and WhatsApp onboarding sent.'
      );
      await fetchOrganizations();
      setTimeout(() => {
        setModalOpen(false);
        setFormSuccess(null);
      }, 900);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalStaff = orgs.reduce((acc, o) => acc + (o.stats?.staffCount || 0), 0);
  const totalWards = orgs.reduce((acc, o) => acc + (o.stats?.wardCount || 0), 0);
  const totalComplaints = orgs.reduce((acc, o) => acc + (o.stats?.complaintCount || 0), 0);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#09090E] flex items-center justify-center">
        <div
          className="w-9 h-9 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: '#EECDA3', borderRightColor: '#EF629F' }}
        />
      </div>
    );
  }

  // =========================================================================
  // AUTH GATE (DARK THEME + TRANQUIL GRADIENT)
  // =========================================================================
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#09090E] text-white flex flex-col justify-center items-center px-4 relative overflow-hidden">
        {/* Ambient Tranquil Glows */}
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[140px] opacity-25 pointer-events-none"
          style={{ background: '#EECDA3' }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-[140px] opacity-25 pointer-events-none"
          style={{ background: '#EF629F' }}
        />

        <div className="w-full max-w-md relative z-10 space-y-6">
          <div className="text-center space-y-2">
            <div
              className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center shadow-lg"
              style={{ background: TRANQUIL_GRADIENT }}
            >
              <Crown className="w-7 h-7 text-[#09090E]" />
            </div>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-[#EECDA3] to-[#EF629F] bg-clip-text text-transparent">
              Praja Seva Founder Command
            </h1>
            <p className="text-xs text-zinc-400">
              Master Constituency Enrollment & Modular BYOK Infrastructure
            </p>
          </div>

          <div className="rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {otpStep === 'PHONE' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Master Founder Mobile
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-sm">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit Founder Mobile"
                      maxLength={10}
                      className="w-full h-11 pl-12 pr-3.5 rounded-xl bg-white/[0.06] border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-[#EF629F]"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading || phone.length < 10}
                  className="w-full h-11 rounded-xl font-extrabold text-sm text-[#09090E] flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                  style={{ background: TRANQUIL_GRADIENT }}
                >
                  <Lock className="w-4 h-4" />
                  <span>{authLoading ? 'Sending WhatsApp OTP...' : 'Send Founder OTP'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <p className="text-xs text-zinc-400 text-center">
                  Enter the 6-digit WhatsApp OTP sent to <strong className="text-white">+91 {phone}</strong>
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full h-12 text-center tracking-[0.5em] font-mono text-xl font-bold rounded-xl bg-white/[0.06] border border-white/10 text-white focus:outline-none focus:border-[#EF629F]"
                  required
                />
                <button
                  type="submit"
                  disabled={authLoading || otpCode.length < 6}
                  className="w-full h-11 rounded-xl font-extrabold text-sm text-[#09090E] flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                  style={{ background: TRANQUIL_GRADIENT }}
                >
                  <span>{authLoading ? 'Verifying...' : 'Unlock Founder Portal'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setOtpStep('PHONE')}
                  className="w-full text-xs text-zinc-400 hover:text-white transition cursor-pointer"
                >
                  Change Mobile Number
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MAIN FOUNDER COMMAND CENTER
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#09090E] text-white relative overflow-x-hidden">
      {/* Ambient Background Glows */}
      <div
        className="fixed -top-40 -left-40 w-[500px] h-[500px] rounded-full blur-[160px] opacity-15 pointer-events-none"
        style={{ background: '#EECDA3' }}
      />
      <div
        className="fixed -bottom-40 -right-40 w-[500px] h-[500px] rounded-full blur-[160px] opacity-15 pointer-events-none"
        style={{ background: '#EF629F' }}
      />

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#09090E]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md"
              style={{ background: TRANQUIL_GRADIENT }}
            >
              <Crown className="w-5 h-5 text-[#09090E]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black tracking-tight bg-gradient-to-r from-[#EECDA3] to-[#EF629F] bg-clip-text text-transparent truncate">
                Praja Seva Founder Portal
              </h1>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Multi-Tenant Constituency Registry & BYOK Infrastructure
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={openEnrollModal}
              className="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-extrabold text-[#09090E] flex items-center gap-1.5 shadow-lg transition hover:opacity-95 active:scale-95 cursor-pointer"
              style={{ background: TRANQUIL_GRADIENT }}
            >
              <Plus className="w-4 h-4" />
              <span>Enroll Constituency</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-300 transition cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 relative z-10">
        {/* Global KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            { label: 'Constituencies', value: orgs.length, icon: Building2 },
            { label: 'Active Staff', value: totalStaff, icon: Users },
            { label: 'Configured Wards', value: totalWards, icon: MapPin },
            { label: 'Total Grievances', value: totalComplaints, icon: FileCheck2 },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 backdrop-blur-md flex items-center justify-between"
            >
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  {item.label}
                </p>
                <p className="text-2xl font-black mt-1 bg-gradient-to-r from-[#EECDA3] to-[#EF629F] bg-clip-text text-transparent">
                  {item.value}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-[#EECDA3]">
                <item.icon className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        {/* Constituency Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#EF629F]" />
              Enrolled Constituencies ({orgs.length})
            </h2>
          </div>

          {loadingOrgs ? (
            <div className="rounded-3xl bg-white/[0.03] border border-white/10 p-12 text-center text-xs text-zinc-400">
              Loading constituency registry...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {orgs.map((org) => {
                const isByok = org.infrastructure_mode === 'DEDICATED_BYOK';
                return (
                  <div
                    key={org.id}
                    className="rounded-3xl bg-white/[0.04] border border-white/10 hover:border-[#EF629F]/40 p-5 backdrop-blur-md transition space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black text-white truncate">{org.name}</h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                              isByok
                                ? 'bg-[#EF629F]/15 text-[#EECDA3] border-[#EF629F]/40'
                                : 'bg-white/[0.06] text-zinc-300 border-white/10'
                            }`}
                          >
                            {isByok ? 'Dedicated BYOK' : 'Shared Cloud'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">
                          Leader: <strong className="text-zinc-200">{org.mla_name}</strong> • Admin:{' '}
                          <span className="font-mono text-[#EECDA3]">+91 {org.founder_phone}</span>
                        </p>
                        <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                          Slug: {org.slug} {org.custom_domain ? `• ${org.custom_domain}` : ''}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => openEditModal(org)}
                        className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-bold text-zinc-200 flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5 text-[#EECDA3]" />
                        <span>Edit</span>
                      </button>
                    </div>

                    {/* Live Org Stats + Quick Launch */}
                    <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-3 text-zinc-400">
                        <span>
                          <strong className="text-white">{org.stats?.staffCount ?? 0}</strong> Staff
                        </span>
                        <span>
                          <strong className="text-white">{org.stats?.wardCount ?? 0}</strong> Wards
                        </span>
                        <span>
                          <strong className="text-white">{org.stats?.complaintCount ?? 0}</strong> Tickets
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/p/${org.slug}`}
                          target="_blank"
                          className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 font-semibold flex items-center gap-1"
                        >
                          <span>Citizen Portal</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                        <Link
                          href={`/m/${org.slug}`}
                          target="_blank"
                          className="px-2.5 py-1 rounded-lg text-[#09090E] font-bold flex items-center gap-1"
                          style={{ background: TRANQUIL_GRADIENT }}
                        >
                          <span>Command</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ===================================================================== */}
      {/* ENROLL / BYOK CONFIGURATION MODAL                                     */}
      {/* ===================================================================== */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-[#12121A] border border-white/15 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-black bg-gradient-to-r from-[#EECDA3] to-[#EF629F] bg-clip-text text-transparent">
                  {editingOrg ? `Configure ${editingOrg.name}` : 'Enroll New Constituency'}
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Constituency Branding, Primary Admin Whitelist & Modular BYOK Slots
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveOrg} className="space-y-4">
              {/* 1. Core Constituency & Admin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                    Constituency Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Tadepalli Assembly Constituency"
                    className="w-full h-10 px-3 rounded-xl bg-white/[0.06] border border-white/10 text-sm text-white focus:outline-none focus:border-[#EF629F]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                    URL Slug *
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    disabled={Boolean(editingOrg)}
                    placeholder="org_tadepalli"
                    className="w-full h-10 px-3 rounded-xl bg-white/[0.06] border border-white/10 text-sm font-mono text-white disabled:opacity-50 focus:outline-none focus:border-[#EF629F]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                    Leader / MLA Name *
                  </label>
                  <input
                    type="text"
                    value={mlaName}
                    onChange={(e) => setMlaName(e.target.value)}
                    placeholder="Leader Full Name"
                    className="w-full h-10 px-3 rounded-xl bg-white/[0.06] border border-white/10 text-sm text-white focus:outline-none focus:border-[#EF629F]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                    Primary Admin Mobile (WhatsApp) *
                  </label>
                  <input
                    type="tel"
                    value={founderPhone}
                    onChange={(e) => setFounderPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    disabled={Boolean(editingOrg)}
                    placeholder="10-digit WhatsApp Number"
                    maxLength={10}
                    className="w-full h-10 px-3 rounded-xl bg-white/[0.06] border border-white/10 text-sm font-mono text-white disabled:opacity-50 focus:outline-none focus:border-[#EF629F]"
                    required
                  />
                </div>
                {!editingOrg && (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                        Primary Admin Name
                      </label>
                      <input
                        type="text"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder="Defaults to Leader Name"
                        className="w-full h-10 px-3 rounded-xl bg-white/[0.06] border border-white/10 text-sm text-white focus:outline-none focus:border-[#EF629F]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                        Initial Wards to Seed
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={initialWardCount}
                        onChange={(e) => setInitialWardCount(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-xl bg-white/[0.06] border border-white/10 text-sm text-white focus:outline-none focus:border-[#EF629F]"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* 2. Domain & Branding */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <p className="text-xs font-extrabold text-[#EECDA3] flex items-center gap-1.5">
                  <Globe className="w-4 h-4" /> Domain & Branding Slot
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="Custom Domain (e.g. seva.constituency.in)"
                    className="w-full h-9 px-3 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    placeholder="Party Name (Optional)"
                    className="w-full h-9 px-3 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={constituencySlogan}
                    onChange={(e) => setConstituencySlogan(e.target.value)}
                    placeholder="Constituency Slogan"
                    className="sm:col-span-2 w-full h-9 px-3 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white"
                  />
                </div>
              </div>

              {/* 3. WhatsApp Dispatch Channels */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <p className="text-xs font-extrabold text-[#EF629F] flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" /> WhatsApp Dispatch Channels
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={whatsappGroupMla}
                    onChange={(e) => setWhatsappGroupMla(e.target.value)}
                    placeholder="MLA Leadership WhatsApp Group ID"
                    className="h-9 px-3 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={whatsappGroupTown}
                    onChange={(e) => setWhatsappGroupTown(e.target.value)}
                    placeholder="Town / Public WhatsApp Group ID"
                    className="h-9 px-3 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full h-11 rounded-xl font-extrabold text-sm text-[#09090E] flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                style={{ background: TRANQUIL_GRADIENT }}
              >
                {saving
                  ? 'Saving...'
                  : editingOrg
                  ? 'Save Constituency Configuration'
                  : 'Enroll Constituency & Notify Admin'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
