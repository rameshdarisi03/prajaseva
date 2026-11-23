'use client';

import React, { useState, useEffect, use, useRef } from 'react';
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
  Users,
  ChevronDown,
  ChevronUp,
  Camera,
  Image as ImageIcon,
  Layers,
  Eye,
  Check,
  Edit3,
  RotateCcw
} from 'lucide-react';
import { IndianLanguage, MGMT_TRANSLATIONS } from '@/lib/mgmtI18n';
import VictoryPRPoster, {
  CoalitionBrandingConfig,
  DEFAULT_COALITION_CONFIG,
  DEFAULT_PARTIES,
  CoalitionParty,
} from '@/components/VictoryPRPoster';
import ImageCropModal from '@/components/ImageCropModal';
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
  const [isSubmittingWard, setIsSubmittingWard] = useState(false);

  // Edit Ward Modal
  const [showEditWard, setShowEditWard] = useState(false);
  const [editingWardId, setEditingWardId] = useState<string | null>(null);
  const [editWardNumber, setEditWardNumber] = useState('');
  const [editWardName, setEditWardName] = useState('');
  const [isUpdatingWard, setIsUpdatingWard] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'poster' | 'pr_poster' | 'wards' | 'profile'>('pr_poster');

  // Coalition & PR Poster Branding State
  const [coalitionConfig, setCoalitionConfig] = useState<CoalitionBrandingConfig>(DEFAULT_COALITION_CONFIG);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Simplified UI & Accordion State
  const [expandedLeader, setExpandedLeader] = useState<'pm' | 'cm' | 'dyCm' | 'mla' | null>('pm');
  const [mobilePrView, setMobilePrView] = useState<'settings' | 'preview'>('settings');

  // Image Crop Modal State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<
    { type: 'leader'; key: 'pm' | 'cm' | 'dyCm' | 'mla' } | { type: 'party'; id: string } | null
  >(null);
  const [cropTitle, setCropTitle] = useState('Adjust & Crop Photo');
  const [cropAspectRatio, setCropAspectRatio] = useState<'circle' | 'square'>('circle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger file upload from device
  const triggerPhotoUpload = (
    target: { type: 'leader'; key: 'pm' | 'cm' | 'dyCm' | 'mla' } | { type: 'party'; id: string },
    title: string,
    aspect: 'circle' | 'square' = 'circle'
  ) => {
    setCropTarget(target);
    setCropTitle(title);
    setCropAspectRatio(aspect);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCropImageSrc(event.target.result as string);
        setCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedDataUrl: string) => {
    if (!cropTarget) return;
    if (cropTarget.type === 'leader') {
      const key = cropTarget.key;
      setCoalitionConfig((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          photoUrl: croppedDataUrl,
        },
      }));
    } else if (cropTarget.type === 'party') {
      const partyId = cropTarget.id;
      setCoalitionConfig((prev) => ({
        ...prev,
        parties: (prev.parties || DEFAULT_PARTIES).map((p) =>
          p.id === partyId ? { ...p, logoUrl: croppedDataUrl } : p
        ),
      }));
    }
    setCropModalOpen(false);
    setCropImageSrc(null);
    setCropTarget(null);
  };

  // Party Management Helpers
  const currentParties = coalitionConfig.parties || DEFAULT_PARTIES;

  const handleToggleParty = (id: string) => {
    setCoalitionConfig((prev) => ({
      ...prev,
      parties: (prev.parties || DEFAULT_PARTIES).map((p) =>
        p.id === id ? { ...p, enabled: !p.enabled } : p
      ),
    }));
  };

  const handleUpdatePartyName = (id: string, newName: string) => {
    setCoalitionConfig((prev) => ({
      ...prev,
      parties: (prev.parties || DEFAULT_PARTIES).map((p) =>
        p.id === id ? { ...p, name: newName } : p
      ),
    }));
  };

  const handleAddCustomParty = () => {
    const newId = `party_${Date.now()}`;
    const newParty: CoalitionParty = {
      id: newId,
      name: 'Allied Party',
      symbolTag: '⭐',
      bgColor: 'bg-indigo-600',
      textColor: 'text-white',
      enabled: true,
    };
    setCoalitionConfig((prev) => ({
      ...prev,
      parties: [...(prev.parties || DEFAULT_PARTIES), newParty],
    }));
  };

  const handleRemoveParty = (id: string) => {
    setCoalitionConfig((prev) => ({
      ...prev,
      parties: (prev.parties || DEFAULT_PARTIES).filter((p) => p.id !== id),
    }));
  };

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
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowAddWard(false);
      setWardNumber('');
      setWardName('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to add ward');
    } finally {
      setIsSubmittingWard(false);
    }
  };

  // Open Edit Ward Modal
  const handleOpenEditWard = (ward: Ward) => {
    setEditingWardId(ward.id);
    setEditWardNumber(ward.ward_number);
    setEditWardName(ward.name);
    setShowEditWard(true);
  };

  // Handle Update Ward
  const handleUpdateWard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWardId || !editWardNumber.trim() || !editWardName.trim()) {
      alert('Ward number and name are required');
      return;
    }

    try {
      setIsUpdatingWard(true);
      const res = await fetch('/api/management/wards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingWardId,
          wardNumber: editWardNumber.trim(),
          name: editWardName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowEditWard(false);
      setEditingWardId(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update ward');
    } finally {
      setIsUpdatingWard(false);
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Add Constituency Ward / Area</span>
              </h3>
              <button
                onClick={() => setShowAddWard(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddWard} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Ward Number
                </label>
                <input
                  type="text"
                  value={wardNumber}
                  onChange={(e) => setWardNumber(e.target.value)}
                  placeholder="e.g. 06"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddWard(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWard}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm disabled:opacity-50 transition"
                >
                  {isSubmittingWard ? 'Creating...' : 'Save Ward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Ward Modal */}
      {showEditWard && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <span>Edit Ward / Area</span>
              </h3>
              <button
                onClick={() => setShowEditWard(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateWard} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Ward Number
                </label>
                <input
                  type="text"
                  value={editWardNumber}
                  onChange={(e) => setEditWardNumber(e.target.value)}
                  placeholder="e.g. 01"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Ward / Area Name
                </label>
                <input
                  type="text"
                  value={editWardName}
                  onChange={(e) => setEditWardName(e.target.value)}
                  placeholder="e.g. Ward 01 - Old Town & Bus Stand"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditWard(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingWard}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm disabled:opacity-50 transition"
                >
                  {isUpdatingWard ? 'Updating...' : 'Save Changes'}
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

      {/* Tab 0: Political PR Poster & Coalition Leadership Settings (Simplified & Collapsible) */}
      {activeTab === 'pr_poster' && (
        <>
          {/* Mobile Tab Switcher between Settings & Live Preview */}
          <div className="lg:hidden flex bg-slate-100 p-1 rounded-xl border border-slate-200 mb-3">
            <button
              type="button"
              onClick={() => setMobilePrView('settings')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                mobilePrView === 'settings' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
              }`}
            >
              ⚙️ Coalition & Leaders
            </button>
            <button
              type="button"
              onClick={() => setMobilePrView('preview')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                mobilePrView === 'preview' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Live 4:5 Poster Preview</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Clean Setup Cards (7 cols on desktop) */}
            <div className={`lg:col-span-7 space-y-4 ${mobilePrView === 'preview' ? 'hidden lg:block' : 'block'}`}>
              <form onSubmit={handleSaveCoalitionConfig} className="space-y-4">
                {/* 1. Coalition Identity & Editable Party Badges */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Award className="w-4 h-4 text-amber-500" />
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                        Coalition Title & Editable Party Symbols
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCoalitionConfig(DEFAULT_COALITION_CONFIG)}
                      className="text-[11px] text-blue-600 font-bold hover:underline cursor-pointer"
                    >
                      Reset Defaults
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
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
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Poster Language / పోస్టర్ భాష
                      </label>
                      <select
                        value={coalitionConfig.posterLang || 'te'}
                        onChange={(e) => setCoalitionConfig({ ...coalitionConfig, posterLang: e.target.value as any })}
                        className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="te">తెలుగు (Telugu - Recommended)</option>
                        <option value="en">English (Official)</option>
                        <option value="hi">हिन्दी (Hindi)</option>
                        <option value="ta">தமிழ் (Tamil)</option>
                        <option value="kn">ಕನ್ನಡ (Kannada)</option>
                      </select>
                    </div>
                  </div>

                  {/* Dynamic Party Chips List */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Party Symbols & Names (Editable)
                      </label>
                      <button
                        type="button"
                        onClick={handleAddCustomParty}
                        className="text-[11px] text-blue-600 font-bold hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Party</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {currentParties.map((party) => (
                        <div
                          key={party.id}
                          className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-2 ${
                            party.enabled
                              ? 'bg-white border-slate-200 shadow-2xs'
                              : 'bg-slate-50 border-slate-200/60 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {/* Party Logo / Upload Button with Crop */}
                            <button
                              type="button"
                              onClick={() => triggerPhotoUpload({ type: 'party', id: party.id }, `Crop ${party.name} Logo`, 'circle')}
                              className="relative w-8 h-8 rounded-full overflow-hidden bg-slate-100 border border-slate-300 flex items-center justify-center shrink-0 group hover:border-blue-500"
                              title="Click to change/crop party logo"
                            >
                              {party.logoUrl ? (
                                <img src={party.logoUrl} alt={party.name} className="w-full h-full object-contain" />
                              ) : (
                                <span className="text-xs font-bold">{party.symbolTag || '🏛️'}</span>
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                                <Camera className="w-3 h-3" />
                              </div>
                            </button>

                            {/* Editable Name */}
                            <input
                              type="text"
                              value={party.name}
                              onChange={(e) => handleUpdatePartyName(party.id, e.target.value)}
                              className="w-full h-8 px-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white"
                              placeholder="Party Name"
                            />
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="checkbox"
                              checked={party.enabled}
                              onChange={() => handleToggleParty(party.id)}
                              className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                              title="Toggle on poster"
                            />
                            {currentParties.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveParty(party.id)}
                                className="p-1 text-slate-300 hover:text-red-500 rounded"
                                title="Remove"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Collapsible 4-Tier Leadership Cards (Zero Clutter) */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Users className="w-4 h-4" />
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                        Leadership Hierarchy (Tap to Edit & Crop Photos)
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                      Click leader to expand
                    </span>
                  </div>

                  {/* The 4 Leader Slots */}
                  <div className="space-y-2">
                    {[
                      { key: 'pm' as const, label: 'Prime Minister Slot', icon: '🇮🇳', data: coalitionConfig.pm },
                      { key: 'cm' as const, label: 'Chief Minister Slot', icon: '🏛️', data: coalitionConfig.cm },
                      { key: 'dyCm' as const, label: 'Deputy Chief Minister / Partner', icon: '⭐', data: coalitionConfig.dyCm },
                      { key: 'mla' as const, label: 'Local MLA / Representative', icon: '📍', data: coalitionConfig.mla },
                    ].map((slot) => {
                      const isExpanded = expandedLeader === slot.key;
                      const leader = slot.data;

                      return (
                        <div
                          key={slot.key}
                          className={`rounded-2xl border transition-all ${
                            isExpanded
                              ? 'bg-blue-50/40 border-blue-300 shadow-2xs'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {/* Collapsed Header Row (Always clean & compact) */}
                          <div
                            className="p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
                            onClick={() => setExpandedLeader(isExpanded ? null : slot.key)}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Avatar preview */}
                              <div className="relative w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 to-yellow-300 shrink-0">
                                <div className="w-full h-full rounded-full overflow-hidden bg-slate-800 flex items-center justify-center text-xs font-bold text-amber-300">
                                  {leader.photoUrl ? (
                                    <img
                                      src={leader.photoUrl}
                                      alt={leader.name}
                                      className="w-full h-full object-cover object-top"
                                    />
                                  ) : (
                                    leader.initials
                                  )}
                                </div>
                              </div>

                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                                  <span>{slot.icon}</span>
                                  <span className="truncate">{leader.name}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  {leader.role} • <span className="font-semibold text-slate-700">{slot.label}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                              {/* Toggle Slot Switch */}
                              <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={leader.enabled}
                                  onChange={(e) =>
                                    setCoalitionConfig({
                                      ...coalitionConfig,
                                      [slot.key]: { ...leader, enabled: e.target.checked },
                                    })
                                  }
                                  className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                                />
                                <span className="hidden sm:inline">{leader.enabled ? 'Enabled' : 'Hidden'}</span>
                              </label>

                              {/* Expand/Collapse Chevron */}
                              <button
                                type="button"
                                onClick={() => setExpandedLeader(isExpanded ? null : slot.key)}
                                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Expanded Editor Area */}
                          {isExpanded && (
                            <div className="px-3.5 pb-4 pt-1 border-t border-blue-100 bg-white/70 rounded-b-2xl space-y-3">
                              {/* Photo Uploader with Resizable Crop Action */}
                              <div className="flex items-center gap-3 pt-2">
                                <div className="relative w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 shrink-0 shadow-md">
                                  <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center">
                                    {leader.photoUrl ? (
                                      <img
                                        src={leader.photoUrl}
                                        alt={leader.name}
                                        className="w-full h-full object-cover object-top"
                                      />
                                    ) : (
                                      <span className="font-bold text-amber-300 text-sm">{leader.initials}</span>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      triggerPhotoUpload(
                                        { type: 'leader', key: slot.key },
                                        `Crop ${leader.name} Portrait`,
                                        'circle'
                                      )
                                    }
                                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
                                  >
                                    <Camera className="w-3.5 h-3.5" />
                                    <span>Upload & Crop Photo</span>
                                  </button>
                                  <p className="text-[10px] text-slate-400">
                                    Select and pan/zoom the face in the circle mask.
                                  </p>
                                </div>
                              </div>

                              {/* Leader Name & Role Inputs */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                                    Leader Name
                                  </label>
                                  <input
                                    type="text"
                                    value={leader.name}
                                    onChange={(e) =>
                                      setCoalitionConfig({
                                        ...coalitionConfig,
                                        [slot.key]: { ...leader, name: e.target.value },
                                      })
                                    }
                                    className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>

                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                                    Official Title / Designation
                                  </label>
                                  <input
                                    type="text"
                                    value={leader.role}
                                    onChange={(e) =>
                                      setCoalitionConfig({
                                        ...coalitionConfig,
                                        [slot.key]: { ...leader, role: e.target.value },
                                      })
                                    }
                                    className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Save Button */}
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-98 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save All Changes to Poster</span>
                </button>
              </form>
            </div>

            {/* Right Column: Live Sample 4:5 Poster Preview (5 cols on desktop) */}
            <div className={`lg:col-span-5 space-y-4 ${mobilePrView === 'settings' ? 'hidden lg:block' : 'block'}`}>
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Live 4:5 JPEG Preview (WhatsApp/Instagram)
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    High-Res JPEG
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
        </>
      )}

      {/* Hidden File Picker for Photo & Logo Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Interactive Image Crop & Zoom Modal (Gait Physio Style) */}
      <ImageCropModal
        isOpen={cropModalOpen}
        imageSrc={cropImageSrc}
        aspectRatio={cropAspectRatio}
        title={cropTitle}
        onCrop={handleCropComplete}
        onClose={() => {
          setCropModalOpen(false);
          setCropImageSrc(null);
          setCropTarget(null);
        }}
      />
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
          {/* Responsive Header Toolbar */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Constituency Wards & Areas
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-mono font-bold">
                  {wards.length}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Citizens select their area from this list when lodging grievances on the public portal.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setWardNumber('');
                setWardName('');
                setShowAddWard(true);
              }}
              className="w-full sm:w-auto h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 shrink-0 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">+ Add New Ward</span>
            </button>
          </div>

          {/* MOBILE CARDS VIEW (sm:hidden) - Zero Squishing, Beautiful Hierarchy */}
          <div className="space-y-2.5 sm:hidden">
            {wards.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-xs">
                No wards configured. Tap "+ Add New Ward" to create one.
              </div>
            ) : (
              wards.map((ward) => (
                <div
                  key={ward.id}
                  className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs flex items-center justify-between gap-3 hover:border-slate-300 transition"
                >
                  {/* Ward Number Square Pill */}
                  <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center shrink-0">
                    <span className="font-mono font-black text-blue-700 text-sm">
                      {ward.ward_number}
                    </span>
                  </div>

                  {/* Ward / Area Name & Status (Full Width Breathing Room) */}
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-900 text-sm leading-snug break-words">
                      {ward.name}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        Active on Portal
                      </span>
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditWard(ward)}
                      className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 flex items-center justify-center transition border border-slate-200 cursor-pointer active:scale-95"
                      title="Edit Ward"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteWard(ward.id, ward.name)}
                      className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 flex items-center justify-center transition border border-slate-200 cursor-pointer active:scale-95"
                      title="Delete Ward"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* DESKTOP TABLE VIEW (hidden sm:block) - Clean Columns, No Unused Volunteer Section */}
          <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-5 py-3.5 w-24">Ward #</th>
                  <th className="px-5 py-3.5">Ward / Area Name</th>
                  <th className="px-5 py-3.5 w-44">Status</th>
                  <th className="px-5 py-3.5 text-right w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {wards.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                      No wards configured. Click "+ Add New Ward" to create one.
                    </td>
                  </tr>
                ) : (
                  wards.map((ward) => (
                    <tr key={ward.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-4 font-mono font-bold text-blue-600 text-sm">
                        {ward.ward_number}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-900 text-sm">
                        {ward.name}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active on Portal
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenEditWard(ward)}
                            className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="Edit Ward"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteWard(ward.id, ward.name)}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                            title="Delete Ward"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
