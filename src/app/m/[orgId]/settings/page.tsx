'use client';

import React, { useState, useEffect, use } from 'react';
import {
  Settings,
  QrCode,
  MapPin,
  Plus,
  Trash2,
  Printer,
  Download,
  Building2,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Smartphone,
  Save,
  Globe2,
  Sparkles,
  Award,
  Users
} from 'lucide-react';
import { IndianLanguage, MGMT_TRANSLATIONS } from '@/lib/mgmtI18n';
import VictoryPRPoster, { CoalitionBrandingConfig, DEFAULT_COALITION_CONFIG } from '@/components/VictoryPRPoster';
import { Complaint } from '@/types';

interface Ward {
  id: string;
  ward_number: string;
  name: string;
  incharge_name?: string;
  incharge_phone?: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  mlaName: string;
  mlaDesignation: string;
  partyName: string | null;
  constituencySlogan: string;
}

export default function SettingsAndQRPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const resolvedParams = use(params);
  const orgParam = resolvedParams.orgId;

  const [org, setOrg] = useState<Organization | null>(null);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Ward Modal
  const [showAddWard, setShowAddWard] = useState(false);
  const [wardNumber, setWardNumber] = useState('');
  const [wardName, setWardName] = useState('');
  const [inchargeName, setInchargeName] = useState('');
  const [inchargePhone, setInchargePhone] = useState('');
  const [isSubmittingWard, setIsSubmittingWard] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'poster' | 'pr_poster' | 'wards' | 'profile'>('pr_poster');

  // Coalition & PR Poster Branding State
  const [coalitionConfig, setCoalitionConfig] = useState<CoalitionBrandingConfig>(DEFAULT_COALITION_CONFIG);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Multi-Language State
  const [lang, setLang] = useState<IndianLanguage>('en');

  useEffect(() => {
    const saved = localStorage.getItem('praja_seva_lang') as IndianLanguage;
    if (saved && MGMT_TRANSLATIONS[saved]) {
      setLang(saved);
    }

    try {
      const savedCoalition = localStorage.getItem('praja_coalition_branding');
      if (savedCoalition) {
        setCoalitionConfig(JSON.parse(savedCoalition));
      }
    } catch {}

    const handleLangChange = (e: any) => {
      const newLang = e.detail?.lang as IndianLanguage;
      if (newLang && MGMT_TRANSLATIONS[newLang]) {
        setLang(newLang);
      }
    };

    window.addEventListener('praja_lang_change', handleLangChange);
    return () => window.removeEventListener('praja_lang_change', handleLangChange);
  }, []);

  const handleSaveCoalitionConfig = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('praja_coalition_branding', JSON.stringify(coalitionConfig));
      setSaveSuccessMsg('✓ Coalition leadership & poster branding settings saved!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (e) {
      alert('Failed to save settings to browser storage');
    }
  };

  const t = MGMT_TRANSLATIONS[lang] || MGMT_TRANSLATIONS.en;

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/organizations/${orgParam}`);
      const data = await res.json();
      if (data.organization) setOrg(data.organization);
      if (data.wards) setWards(data.wards);
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgParam]);

  // Handle Add Ward
  const handleAddWard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wardNumber.trim() || !wardName.trim()) {
      alert('Ward number and name required');
      return;
    }

    try {
      setIsSubmittingWard(true);
      const res = await fetch('/api/management/wards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: org?.id || orgParam,
          wardNumber: wardNumber.trim(),
          name: wardName.trim(),
          inchargeName: inchargeName.trim() || undefined,
          inchargePhone: inchargePhone.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowAddWard(false);
      setWardNumber('');
      setWardName('');
      setInchargeName('');
      setInchargePhone('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to add ward');
    } finally {
      setIsSubmittingWard(false);
    }
  };

  // Handle Delete Ward
  const handleDeleteWard = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? Complaints currently linked will remain safe.`)) return;
    try {
      const res = await fetch(`/api/management/wards?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      } else {
        alert('Failed to delete ward');
      }
    } catch {
      alert('Error deleting ward');
    }
  };

  const portalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/p/${orgParam}`
    : `https://prajaseva.in/p/${orgParam}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(portalUrl)}&margin=10`;

  return (
    <div className="space-y-6">
      {/* Add Ward Modal */}
      {showAddWard && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Add Constituency Ward / Area
              </h3>
              <button
                onClick={() => setShowAddWard(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddWard} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Ward Number
                </label>
                <input
                  type="text"
                  value={wardNumber}
                  onChange={(e) => setWardNumber(e.target.value)}
                  placeholder="e.g. 06"
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Ward / Area Name
                </label>
                <input
                  type="text"
                  value={wardName}
                  onChange={(e) => setWardName(e.target.value)}
                  placeholder="e.g. Ward 06 - Vidya Nagar & Bus Route"
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Ward Incharge Name (Optional)
                </label>
                <input
                  type="text"
                  value={inchargeName}
                  onChange={(e) => setInchargeName(e.target.value)}
                  placeholder="e.g. Sri V. Nageswara Rao"
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Incharge Phone (Optional)
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={inchargePhone}
                  onChange={(e) => setInchargePhone(e.target.value)}
                  placeholder="98480 12345"
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddWard(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWard}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm disabled:opacity-50"
                >
                  {isSubmittingWard ? 'Creating...' : 'Save Ward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wider border border-blue-200">
            {t.navSettings}
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            {t.navSettings}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure constituency wards, download ready-to-print universal QR posters, and manage office branding
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
          <button
            onClick={() => setActiveTab('pr_poster')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pr_poster' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>PR Poster & Coalition</span>
          </button>
          <button
            onClick={() => setActiveTab('poster')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              activeTab === 'poster' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Universal Citizen QR
          </button>
          <button
            onClick={() => setActiveTab('wards')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              activeTab === 'wards' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ward Management ({wards.length})
          </button>
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Tab 0: Political PR Poster & Coalition Leadership Settings */}
      {activeTab === 'pr_poster' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Coalition & Leader Configuration Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <form onSubmit={handleSaveCoalitionConfig} className="space-y-4">
              {/* Card 1: Coalition Identity & Symbols */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Award className="w-5 h-5 text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Coalition Government & Party Emblems
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCoalitionConfig(DEFAULT_COALITION_CONFIG)}
                    className="text-[11px] text-blue-600 font-bold hover:underline"
                  >
                    Reset AP NDA Alliance Defaults
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Coalition Title / ప్రభుత్వం పేరు
                  </label>
                  <input
                    type="text"
                    value={coalitionConfig.coalitionName}
                    onChange={(e) => setCoalitionConfig({ ...coalitionConfig, coalitionName: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. కూటమి ప్రజా ప్రభుత్వం"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Active Coalition Emblems (Visible on Poster Header)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* TDP */}
                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100/60">
                      <input
                        type="checkbox"
                        checked={coalitionConfig.showTdpLogo}
                        onChange={(e) => setCoalitionConfig({ ...coalitionConfig, showTdpLogo: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🚲 TDP (Cycle)</span>
                    </label>

                    {/* JSP */}
                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100/60">
                      <input
                        type="checkbox"
                        checked={coalitionConfig.showJspLogo}
                        onChange={(e) => setCoalitionConfig({ ...coalitionConfig, showJspLogo: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🥛 JSP (Glass)</span>
                    </label>

                    {/* BJP */}
                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100/60">
                      <input
                        type="checkbox"
                        checked={coalitionConfig.showBjpLogo}
                        onChange={(e) => setCoalitionConfig({ ...coalitionConfig, showBjpLogo: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🪷 BJP (Lotus)</span>
                    </label>

                    {/* AP Govt */}
                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100/60">
                      <input
                        type="checkbox"
                        checked={coalitionConfig.showApGovtLogo}
                        onChange={(e) => setCoalitionConfig({ ...coalitionConfig, showApGovtLogo: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🏛️ AP Govt</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Card 2: The 4 Leadership Slots (PM, CM, Dy CM, MLA) */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 text-blue-600 border-b border-slate-100 pb-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    4-Tier Leadership Hierarchy Strip
                  </h3>
                </div>

                {/* 1. Prime Minister Slot */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      🇮🇳 1. Prime Minister Slot
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={coalitionConfig.pm.enabled}
                        onChange={(e) => setCoalitionConfig({
                          ...coalitionConfig,
                          pm: { ...coalitionConfig.pm, enabled: e.target.checked }
                        })}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      Enable Slot
                    </label>
                  </div>
                  {coalitionConfig.pm.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Leader Name</label>
                        <input
                          type="text"
                          value={coalitionConfig.pm.name}
                          onChange={(e) => setCoalitionConfig({
                            ...coalitionConfig,
                            pm: { ...coalitionConfig.pm, name: e.target.value }
                          })}
                          className="w-full h-9 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Designation</label>
                        <input
                          type="text"
                          value={coalitionConfig.pm.role}
                          onChange={(e) => setCoalitionConfig({
                            ...coalitionConfig,
                            pm: { ...coalitionConfig.pm, role: e.target.value }
                          })}
                          className="w-full h-9 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Chief Minister Slot */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      🏛️ 2. Chief Minister Slot
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={coalitionConfig.cm.enabled}
                        onChange={(e) => setCoalitionConfig({
                          ...coalitionConfig,
                          cm: { ...coalitionConfig.cm, enabled: e.target.checked }
                        })}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      Enable Slot
                    </label>
                  </div>
                  {coalitionConfig.cm.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Leader Name</label>
                        <input
                          type="text"
                          value={coalitionConfig.cm.name}
                          onChange={(e) => setCoalitionConfig({
                            ...coalitionConfig,
                            cm: { ...coalitionConfig.cm, name: e.target.value }
                          })}
                          className="w-full h-9 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Designation</label>
                        <input
                          type="text"
                          value={coalitionConfig.cm.role}
                          onChange={(e) => setCoalitionConfig({
                            ...coalitionConfig,
                            cm: { ...coalitionConfig.cm, role: e.target.value }
                          })}
                          className="w-full h-9 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Deputy Chief Minister Slot */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      ⭐ 3. Deputy Chief Minister / Coalition Partner Slot
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={coalitionConfig.dyCm.enabled}
                        onChange={(e) => setCoalitionConfig({
                          ...coalitionConfig,
                          dyCm: { ...coalitionConfig.dyCm, enabled: e.target.checked }
                        })}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      Enable Slot
                    </label>
                  </div>
                  {coalitionConfig.dyCm.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Leader Name</label>
                        <input
                          type="text"
                          value={coalitionConfig.dyCm.name}
                          onChange={(e) => setCoalitionConfig({
                            ...coalitionConfig,
                            dyCm: { ...coalitionConfig.dyCm, name: e.target.value }
                          })}
                          className="w-full h-9 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Designation</label>
                        <input
                          type="text"
                          value={coalitionConfig.dyCm.role}
                          onChange={(e) => setCoalitionConfig({
                            ...coalitionConfig,
                            dyCm: { ...coalitionConfig.dyCm, role: e.target.value }
                          })}
                          className="w-full h-9 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Local MLA / Representative Slot */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      📍 4. Local MLA / Representative Slot
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={coalitionConfig.mla.enabled}
                        onChange={(e) => setCoalitionConfig({
                          ...coalitionConfig,
                          mla: { ...coalitionConfig.mla, enabled: e.target.checked }
                        })}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      Enable Slot
                    </label>
                  </div>
                  {coalitionConfig.mla.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">MLA Name</label>
                        <input
                          type="text"
                          value={coalitionConfig.mla.name}
                          onChange={(e) => setCoalitionConfig({
                            ...coalitionConfig,
                            mla: { ...coalitionConfig.mla, name: e.target.value }
                          })}
                          className="w-full h-9 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Designation</label>
                        <input
                          type="text"
                          value={coalitionConfig.mla.role}
                          onChange={(e) => setCoalitionConfig({
                            ...coalitionConfig,
                            mla: { ...coalitionConfig.mla, role: e.target.value }
                          })}
                          className="w-full h-9 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-98 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Coalition Branding & Poster Layout</span>
              </button>
            </form>
          </div>

          {/* Right Column: Live Sample 4:5 Poster Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Live 4:5 JPEG Preview (WhatsApp/Instagram)
                </span>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  4:5 High-Res JPEG
                </span>
              </div>

              <VictoryPRPoster
                ticket={{
                  id: 'sample-001',
                  organization_id: orgParam,
                  ticket_number: 'CMP-1005',
                  citizen_name: 'రమేష్ దరిసి (Citizen)',
                  citizen_phone: '9206651295',
                  category: 'Drainage & Sewage',
                  location_address: 'Kaggadasapura To Ring Road, Ward 01',
                  latitude: 16.4419,
                  longitude: 80.5658,
                  is_phone_verified: true,
                  description: 'Underground drainage overflow rectified with municipal jetting team.',
                  status: 'RESOLVED',
                  created_at: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(),
                  submitted_for_approval_at: new Date().toISOString(),
                  before_photo_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?w=600&auto=format&fit=crop&q=80',
                  after_photo_url: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600&auto=format&fit=crop&q=80',
                  proximity_meters: 18,
                  is_proximity_verified: true,
                } as unknown as Complaint}
                org={org}
                config={coalitionConfig}
              />
            </div>
          </div>
        </div>
      )}
      {activeTab === 'poster' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls & Direct Link (4 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 text-blue-600">
                <QrCode className="w-5 h-5" />
                <h3 className="text-sm font-bold text-slate-900">
                  Universal Constituency QR System
                </h3>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                This is your <strong>Single Universal QR Code</strong>. Print and attach this poster across bus stops, street corners, ward offices, and municipal junctions.
              </p>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  Direct Citizen Portal URL
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-blue-600 truncate">
                    {portalUrl}
                  </span>
                  <a
                    href={portalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                    title="Open Link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Ready-to-Hang A4 Poster</span>
                </button>
                <a
                  href={qrImageUrl}
                  download="prajaseva_qr.png"
                  className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Standalone QR PNG</span>
                </a>
              </div>
            </div>
          </div>

          {/* Printable A4 Poster Sheet Preview (7 cols) */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl p-8 border-2 border-slate-300 shadow-lg text-center space-y-6 max-w-xl mx-auto print:border-none print:shadow-none">
              {/* Poster Header */}
              <div className="space-y-2 border-b-2 border-slate-900 pb-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-700 text-white font-black flex items-center justify-center mx-auto text-xl shadow-md">
                  AP
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                  {org?.name || 'MANGALAGIRI ASSEMBLY CONSTITUENCY'}
                </h2>
                <p className="text-xs font-bold text-blue-700 uppercase tracking-widest">
                  OFFICE OF {org?.mlaName || 'SRI RAMESH DARISI'} • {org?.mlaDesignation || 'MEMBER OF LEGISLATIVE ASSEMBLY'}
                </p>
              </div>

              {/* Poster Telugu & English Slogan */}
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">
                  మీ పరిసరాల్లోని సమస్యలను నేరుగా తెలియజేయండి
                </h3>
                <p className="text-xs font-semibold text-slate-500">
                  Scan QR Code to report civic grievances directly to MLA Office
                </p>
              </div>

              {/* Big High-Res QR Code Card */}
              <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl inline-block shadow-inner">
                <img
                  src={qrImageUrl}
                  alt="Universal QR Code"
                  className="w-64 h-64 mx-auto rounded-xl object-contain bg-white p-2 border border-slate-200"
                />
                <span className="text-[11px] font-mono font-bold text-slate-500 mt-2 block">
                  1-TAP CITIZEN CARE PORTAL
                </span>
              </div>

              {/* 3 Step Instructions */}
              <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-blue-600 block text-sm">1</span>
                  <span className="font-bold text-slate-900 text-[11px] block mt-0.5">Scan QR</span>
                  <span className="text-[9px] text-slate-500">No App download</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-blue-600 block text-sm">2</span>
                  <span className="font-bold text-slate-900 text-[11px] block mt-0.5">Snap Photo</span>
                  <span className="text-[9px] text-slate-500">Auto GPS Location</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-emerald-600 block text-sm">3</span>
                  <span className="font-bold text-slate-900 text-[11px] block mt-0.5">Get Solved!</span>
                  <span className="text-[9px] text-slate-500">WhatsApp alerts</span>
                </div>
              </div>

              {/* Footer Slogan */}
              <div className="border-t border-slate-200 pt-4">
                <p className="text-xs font-bold text-slate-800 font-mono">
                  "{org?.constituencySlogan || 'ప్రజల కోసం... ప్రజా సేవలో...'}"
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Ward Management */}
      {activeTab === 'wards' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Citizens scanning the Universal QR will select their ward from this list on the public portal.
            </p>
            <button
              type="button"
              onClick={() => setShowAddWard(true)}
              className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Ward</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-5 py-3.5">Ward #</th>
                  <th className="px-5 py-3.5">Ward / Area Name</th>
                  <th className="px-5 py-3.5">Incharge Contact</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {wards.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                      No wards configured. Click "+ Add New Ward" to create one.
                    </td>
                  </tr>
                ) : (
                  wards.map((ward) => (
                    <tr key={ward.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-4 font-mono font-bold text-blue-600">
                        {ward.ward_number}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-900">
                        {ward.name}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {ward.incharge_name ? (
                          <span>
                            {ward.incharge_name}{' '}
                            {ward.incharge_phone && (
                              <span className="font-mono text-[11px] text-slate-400">
                                (+91 {ward.incharge_phone})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400">Not assigned</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active on Portal
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleDeleteWard(ward.id, ward.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Delete Ward"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
