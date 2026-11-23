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
  Sparkles
} from 'lucide-react';
import { IndianLanguage, MGMT_TRANSLATIONS } from '@/lib/mgmtI18n';

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
  const [activeTab, setActiveTab] = useState<'poster' | 'wards' | 'profile'>('poster');

  // Multi-Language State
  const [lang, setLang] = useState<IndianLanguage>('en');

  useEffect(() => {
    const saved = localStorage.getItem('praja_seva_lang') as IndianLanguage;
    if (saved && MGMT_TRANSLATIONS[saved]) {
      setLang(saved);
    }

    const handleLangChange = (e: any) => {
      const newLang = e.detail?.lang as IndianLanguage;
      if (newLang && MGMT_TRANSLATIONS[newLang]) {
        setLang(newLang);
      }
    };

    window.addEventListener('praja_lang_change', handleLangChange);
    return () => window.removeEventListener('praja_lang_change', handleLangChange);
  }, []);

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
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('poster')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'poster' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
            }`}
          >
            Universal QR Poster
          </button>
          <button
            onClick={() => setActiveTab('wards')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'wards' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
            }`}
          >
            Ward Management ({wards.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Universal QR Poster Generator */}
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
