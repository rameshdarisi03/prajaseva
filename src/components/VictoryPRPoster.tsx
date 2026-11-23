'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Download, Share2, Sparkles, ShieldCheck, CheckCircle2, QrCode as QrIcon, LayoutGrid, Rows3, Languages } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toJpeg } from 'html-to-image';
import { Complaint } from '@/types';
import { calculateTurnaround } from '@/lib/dateUtils';

export interface LeaderProfile {
  enabled: boolean;
  name: string;
  role: string;
  photoUrl?: string;
  initials: string;
}

export interface CoalitionParty {
  id: string;
  name: string;
  symbolTag?: string;
  logoUrl?: string;
  bgColor?: string;
  textColor?: string;
  enabled: boolean;
}

export interface CoalitionBrandingConfig {
  coalitionName: string;
  posterLang?: 'te' | 'en' | 'hi' | 'ta' | 'kn';
  parties?: CoalitionParty[];
  pm: LeaderProfile;
  cm: LeaderProfile;
  dyCm: LeaderProfile;
  mla: LeaderProfile;
  showTdpLogo?: boolean;
  showJspLogo?: boolean;
  showBjpLogo?: boolean;
  showApGovtLogo?: boolean;
}

export const POSTER_TRANSLATIONS = {
  te: {
    govtHeader: 'ఆంధ్రప్రదేశ్ ప్రభుత్వం',
    coalitionDefault: 'కూటమి ప్రజా ప్రభుత్వం',
    beforeBadge: '🔴 సమస్య (BEFORE)',
    afterBadge: '🟢 పరిష్కారం (AFTER ✓)',
    resolvedBanner: '⚡ 100% పరిష్కారం',
    inTurnaround: 'పూర్తయిన సమయం',
    lodged: 'నమోదు',
    verified: 'ధృవీకరించబడింది',
    ticket: 'ఫిర్యాదు ఐడీ',
    scanTitle: 'సమస్యల నమోదుకు స్కాన్ చేయండి',
    scanSub: 'ప్రజా సేవ సిటిజన్ పోర్టల్',
    officialPR: 'అధికారిక ప్రజా సంక్షేమ నివేదిక',
    gpsVerified: 'GPS Geofence ధృవీకరించబడింది',
  },
  en: {
    govtHeader: 'GOVERNMENT OF ANDHRA PRADESH',
    coalitionDefault: 'ALLIANCE CITIZEN GOVERNMENT',
    beforeBadge: '🔴 BEFORE (CITIZEN ISSUE)',
    afterBadge: '🟢 AFTER (RESOLVED ✓)',
    resolvedBanner: '⚡ 100% CIVIC RESOLUTION',
    inTurnaround: 'RESOLVED IN',
    lodged: 'Lodged',
    verified: 'Verified',
    ticket: 'Ticket ID',
    scanTitle: 'Scan to Lodge Civic Grievances',
    scanSub: 'Praja Seva Citizen Portal',
    officialPR: 'OFFICIAL RESOLUTION RECORD',
    gpsVerified: 'GPS Geofence Verified',
  },
  hi: {
    govtHeader: 'आंध्र प्रदेश सरकार',
    coalitionDefault: 'गठबंधन जन सरकार',
    beforeBadge: '🔴 समस्या (BEFORE)',
    afterBadge: '🟢 समाधान (AFTER ✓)',
    resolvedBanner: '⚡ 100% समाधान',
    inTurnaround: 'में समाधान',
    lodged: 'दर्ज',
    verified: 'सत्यापित',
    ticket: 'शिकायत संख्या',
    scanTitle: 'समस्या दर्ज करने हेतु स्कैन करें',
    scanSub: 'प्रजा सेवा नागरिक पोर्टल',
    officialPR: 'आधिकारिक निवारण रिपोर्ट',
    gpsVerified: 'GPS सत्यापन',
  },
  ta: {
    govtHeader: 'ஆந்திரப் பிரதேச அரசு',
    coalitionDefault: 'கூட்டணி மக்கள் அரசு',
    beforeBadge: '🔴 பிரச்சனை (BEFORE)',
    afterBadge: '🟢 தீர்வு (AFTER ✓)',
    resolvedBanner: '⚡ 100% தீர்வு',
    inTurnaround: 'இல் தீர்க்கப்பட்டது',
    lodged: 'பதிவு',
    verified: 'சரிபார்க்கப்பட்டது',
    ticket: 'டிக்கெட் ஐடி',
    scanTitle: 'புகார் அளிக்க ஸ்கேன் செய்யவும்',
    scanSub: 'பிரஜா சேவா போர்டல்',
    officialPR: 'அதிகாரப்பூர்வ அறிக்கை',
    gpsVerified: 'GPS சரிபார்ப்பு',
  },
  kn: {
    govtHeader: 'ಆಂಧ್ರಪ್ರದೇಶ ಸರ್ಕಾರ',
    coalitionDefault: 'ಮೈತ್ರಿ ಜನ ಸರ್ಕಾರ',
    beforeBadge: '🔴 ಸಮಸ್ಯೆ (BEFORE)',
    afterBadge: '🟢 ಪರಿಹಾರ (AFTER ✓)',
    resolvedBanner: '⚡ 100% ಪರಿಹಾರ',
    inTurnaround: 'ನಲ್ಲಿ ಪರಿಹರಿಸಲಾಗಿದೆ',
    lodged: 'ದಾಖಲು',
    verified: 'ಪರಿಶೀಲಿಸಲಾಗಿದೆ',
    ticket: 'ದೂರು ಸಂಖ್ಯೆ',
    scanTitle: 'ಸಮಸ್ಯೆ ದಾಖಲಿಸಲು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ',
    scanSub: 'ಪ್ರಜಾ ಸೇವಾ ಪೋರ್ಟಲ್',
    officialPR: 'ಅಧಿಕೃತ ವರದಿ',
    gpsVerified: 'GPS ಪರಿಶೀಲನೆ',
  },
};

export const DEFAULT_PARTIES: CoalitionParty[] = [
  {
    id: 'tdp',
    name: 'TDP',
    symbolTag: '🚲',
    bgColor: 'bg-yellow-400',
    textColor: 'text-black',
    enabled: true,
  },
  {
    id: 'jsp',
    name: 'JSP',
    symbolTag: '🥛',
    bgColor: 'bg-red-600',
    textColor: 'text-white',
    enabled: true,
  },
  {
    id: 'bjp',
    name: 'BJP',
    symbolTag: '🪷',
    bgColor: 'bg-orange-500',
    textColor: 'text-white',
    enabled: true,
  },
  {
    id: 'ap_govt',
    name: 'AP Govt',
    symbolTag: '🏛️',
    bgColor: 'bg-white/10',
    textColor: 'text-amber-300',
    enabled: true,
  },
];

export const DEFAULT_COALITION_CONFIG: CoalitionBrandingConfig = {
  coalitionName: 'కూటమి ప్రజా ప్రభుత్వం',
  posterLang: 'te',
  parties: DEFAULT_PARTIES,
  pm: {
    enabled: true,
    name: 'Sri Narendra Modi',
    role: 'Hon\'ble Prime Minister',
    initials: 'NM',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Narendra_Modi_2021.jpg/480px-Narendra_Modi_2021.jpg',
  },
  cm: {
    enabled: true,
    name: 'Sri N. Chandrababu Naidu',
    role: 'Hon\'ble Chief Minister',
    initials: 'CBN',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/N._Chandrababu_Naidu_in_2024.jpg/480px-N._Chandrababu_Naidu_in_2024.jpg',
  },
  dyCm: {
    enabled: true,
    name: 'Sri Pawan Kalyan',
    role: 'Hon\'ble Deputy Chief Minister',
    initials: 'PK',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Pawan_Kalyan_in_2024.jpg/480px-Pawan_Kalyan_in_2024.jpg',
  },
  mla: {
    enabled: true,
    name: 'Sri Ramesh Darisi',
    role: 'Local MLA / Incharge',
    initials: 'RD',
    photoUrl: '',
  },
  showTdpLogo: true,
  showJspLogo: true,
  showBjpLogo: true,
  showApGovtLogo: true,
};

interface VictoryPRPosterProps {
  ticket: Complaint;
  org?: {
    name?: string;
    mlaName?: string;
    constituencySlogan?: string;
    slug?: string;
  } | null;
  config?: CoalitionBrandingConfig;
  onDownloaded?: () => void;
}

export default function VictoryPRPoster({
  ticket,
  org,
  config = DEFAULT_COALITION_CONFIG,
  onDownloaded,
}: VictoryPRPosterProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [coalitionConfig, setCoalitionConfig] = useState<CoalitionBrandingConfig>(config);

  // Dynamic Image Layout Mode: 'auto' | 'side' | 'stacked'
  const [layoutMode, setLayoutMode] = useState<'auto' | 'side' | 'stacked'>('auto');
  const [detectedLayout, setDetectedLayout] = useState<'side' | 'stacked'>('side');

  // Poster Language State
  const [activeLang, setActiveLang] = useState<'te' | 'en' | 'hi' | 'ta' | 'kn'>(config.posterLang || 'te');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('praja_coalition_branding');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.parties) parsed.parties = DEFAULT_PARTIES;
        setCoalitionConfig(parsed);
        if (parsed.posterLang) setActiveLang(parsed.posterLang);
      }
    } catch {}
  }, []);

  // Sync when parent updates config prop
  useEffect(() => {
    if (config) {
      setCoalitionConfig(config);
      if (config.posterLang) setActiveLang(config.posterLang);
    }
  }, [config]);

  // Detect Aspect Ratios of Images for Dynamic Layout
  useEffect(() => {
    if (!ticket.before_photo_url && !ticket.after_photo_url) return;
    let isLand1 = false;
    let isLand2 = false;
    let checked = 0;

    const check = () => {
      checked++;
      if (checked >= 1) {
        // If either image is landscape (ratio > 1.15), stacked vertical gives maximum clarity
        if (isLand1 || isLand2) {
          setDetectedLayout('stacked');
        } else {
          setDetectedLayout('side');
        }
      }
    };

    if (ticket.before_photo_url) {
      const img1 = new Image();
      img1.crossOrigin = 'anonymous';
      img1.onload = () => {
        isLand1 = img1.naturalWidth / img1.naturalHeight > 1.15;
        check();
      };
      img1.onerror = () => check();
      img1.src = ticket.before_photo_url;
    }

    if (ticket.after_photo_url) {
      const img2 = new Image();
      img2.crossOrigin = 'anonymous';
      img2.onload = () => {
        isLand2 = img2.naturalWidth / img2.naturalHeight > 1.15;
        check();
      };
      img2.onerror = () => check();
      img2.src = ticket.after_photo_url;
    }
  }, [ticket.before_photo_url, ticket.after_photo_url]);

  const activeLayout = layoutMode === 'auto' ? detectedLayout : layoutMode;
  const activeConfig = coalitionConfig;
  const t = POSTER_TRANSLATIONS[activeLang] || POSTER_TRANSLATIONS.te;

  const turnaroundTime = calculateTurnaround(
    ticket.created_at,
    ticket.submitted_for_approval_at || new Date().toISOString()
  );

  const portalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/p/${org?.slug || 'mangalagiri'}`
    : 'https://prajaseva-one.vercel.app';

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return '22 Nov, 07:38 PM';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(activeLang === 'te' ? 'te-IN' : 'en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoStr;
    }
  };

  // 1-Tap JPEG Download Handler
  const handleDownloadJpeg = async () => {
    if (!posterRef.current) return;
    try {
      setIsGenerating(true);
      setDownloadSuccess(false);

      const dataUrl = await toJpeg(posterRef.current, {
        quality: 0.95,
        pixelRatio: 2.5,
        cacheBust: true,
        backgroundColor: '#060a17',
      });

      const filename = `${ticket.ticket_number || 'CIVIC'}_Andhra_Pradesh_Victory_Poster.jpg`;
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess(true);
      if (onDownloaded) onDownloaded();
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to generate poster JPEG:', err);
      alert('Unable to generate image directly. Please take a quick screenshot of the poster preview.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Share to WhatsApp Status / Chat
  const handleShareToWhatsApp = () => {
    const text = encodeURIComponent(
      `🏆 *${t.resolvedBanner}!* 🏆\n` +
      `🏛️ ${org?.name || 'మంగళగిరి నియోజకవర్గం'}\n` +
      `⚡ ${ticket.category}\n` +
      `📍 ${ticket.location_address || 'వార్డు పరిధి'}\n` +
      `⏱️ ${t.inTurnaround}: ${turnaroundTime}\n` +
      `📋 #${ticket.ticket_number}\n\n` +
      `"${org?.constituencySlogan || 'ప్రజల కోసం... ప్రజా సేవలో...'}"\n` +
      `${t.scanTitle}: ${portalUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const leaders = [
    { ...activeConfig.pm, key: 'pm' },
    { ...activeConfig.cm, key: 'cm' },
    { ...activeConfig.dyCm, key: 'dyCm' },
    { ...activeConfig.mla, name: org?.mlaName || activeConfig.mla.name, key: 'mla' },
  ].filter((l) => l.enabled);

  const activeParties = (activeConfig.parties && activeConfig.parties.length > 0)
    ? activeConfig.parties.filter((p) => p.enabled)
    : DEFAULT_PARTIES.filter((p) => {
        if (p.id === 'tdp') return activeConfig.showTdpLogo !== false;
        if (p.id === 'jsp') return activeConfig.showJspLogo !== false;
        if (p.id === 'bjp') return activeConfig.showBjpLogo !== false;
        if (p.id === 'ap_govt') return activeConfig.showApGovtLogo !== false;
        return p.enabled;
      });

  return (
    <div className="space-y-3 w-full">
      {/* Dynamic Controls Bar: Layout & Language */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
        {/* Dynamic Aspect Ratio Layout Switcher */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase px-1.5 hidden sm:inline">
            Layout:
          </span>
          <button
            type="button"
            onClick={() => setLayoutMode('auto')}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
              layoutMode === 'auto' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Auto-detect aspect ratio"
          >
            <span>Auto</span>
            <span className="text-[9px] opacity-75">({detectedLayout === 'stacked' ? '↕️' : '↔️'})</span>
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode('side')}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
              layoutMode === 'side' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Side-by-side (Ideal for portrait photos)"
          >
            <LayoutGrid className="w-3 h-3" />
            <span>Side-by-Side</span>
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode('stacked')}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
              layoutMode === 'stacked' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Stacked (Ideal for wide landscape photos)"
          >
            <Rows3 className="w-3 h-3" />
            <span>Stacked</span>
          </button>
        </div>

        {/* Poster Language Switcher */}
        <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-slate-200">
          <Languages className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="text-[10px] font-bold text-slate-400 uppercase hidden sm:inline">Lang:</span>
          <select
            value={activeLang}
            onChange={(e) => {
              const newLang = e.target.value as any;
              setActiveLang(newLang);
              setCoalitionConfig((prev) => ({ ...prev, posterLang: newLang }));
              try {
                const saved = localStorage.getItem('praja_coalition_branding');
                if (saved) {
                  const p = JSON.parse(saved);
                  p.posterLang = newLang;
                  localStorage.setItem('praja_coalition_branding', JSON.stringify(p));
                }
              } catch {}
            }}
            className="text-xs font-bold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
          >
            <option value="te">తెలుగు (Telugu)</option>
            <option value="en">English</option>
            <option value="hi">हिन्दी (Hindi)</option>
            <option value="ta">தமிழ் (Tamil)</option>
            <option value="kn">ಕನ್ನಡ (Kannada)</option>
          </select>
        </div>
      </div>

      {/* Action Buttons Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <button
          type="button"
          onClick={handleDownloadJpeg}
          disabled={isGenerating}
          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-600/30 transition active:scale-98 cursor-pointer disabled:opacity-60"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>
            {isGenerating ? 'చిత్రం డౌన్‌లోడ్ అవుతోంది...' : '1-Tap Download JPEG (WhatsApp Status)'}
          </span>
        </button>

        <button
          type="button"
          onClick={handleShareToWhatsApp}
          className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition active:scale-98 cursor-pointer shrink-0"
        >
          <Share2 className="w-4 h-4 shrink-0" />
          <span>WhatsApp Status</span>
        </button>
      </div>

      {downloadSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>✓ JPEG పోస్టర్ డౌన్‌లోడ్ చేయబడింది! WhatsApp Status లో షేర్ చేయండి.</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4:5 HIGH-IMPACT COALITION PR POSTER CONTAINER                             */}
      {/* ========================================================================= */}
      <div className="w-full flex justify-center overflow-x-auto p-1">
        <div
          ref={posterRef}
          id="victory-pr-poster"
          className="w-full max-w-[480px] aspect-[4/5] bg-gradient-to-b from-[#060a17] via-[#0b1329] to-[#040711] text-white rounded-3xl p-4 sm:p-5 flex flex-col justify-between border-2 border-amber-500/50 shadow-2xl relative overflow-hidden select-none"
          style={{ minHeight: '620px' }}
        >
          {/* Subtle Golden Glow / Decorative Header Aura */}
          <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-amber-500/15 via-transparent to-transparent pointer-events-none" />
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-600/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-emerald-600/20 rounded-full blur-2xl pointer-events-none" />

          {/* 1. TOP COALITION EMBLEMS & GOVT BANNER */}
          <div className="relative z-10 flex items-center justify-between border-b border-amber-400/20 pb-2">
            {/* Coalition Party Symbols (Horizontal compact row) */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              {activeParties.map((party) => (
                <div key={party.id}>
                  {party.logoUrl ? (
                    <div
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden border border-amber-400/80 bg-white shadow-xs shrink-0 flex items-center justify-center p-0.5"
                      title={party.name}
                    >
                      <img
                        src={party.logoUrl}
                        alt={party.name}
                        className="w-full h-full object-contain"
                        crossOrigin="anonymous"
                      />
                    </div>
                  ) : (
                    <div
                      className={`h-5 sm:h-6 px-1.5 rounded-full ${party.bgColor || 'bg-blue-600'} border border-white/20 flex items-center justify-center gap-0.5 shadow-xs shrink-0`}
                      title={party.name}
                    >
                      {party.symbolTag && <span className="text-[9px]">{party.symbolTag}</span>}
                      <span className={`text-[8px] sm:text-[9px] font-black ${party.textColor || 'text-white'}`}>
                        {party.name}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Central Coalition Motto */}
            <div className="flex flex-col items-center text-center px-1">
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-amber-300">
                {activeConfig.coalitionName || t.coalitionDefault}
              </span>
              <span className="text-[7.5px] sm:text-[8px] text-white/70 font-semibold tracking-tight">
                {t.govtHeader}
              </span>
            </div>
          </div>

          {/* 2. THE 4-PILLAR LEADERSHIP STRIP (STRICT HORIZONTAL COMPACT ROW - NEVER VERTICAL) */}
          <div className="relative z-10 py-1.5 border-b border-white/10">
            <div className="flex flex-row items-start justify-around w-full gap-1">
              {leaders.map((leader) => (
                <div key={leader.key} className="flex flex-col items-center text-center flex-1 min-w-0 px-0.5">
                  {/* Gold-Ring Portrait Frame (Compact ~38px-44px) */}
                  <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-500 shadow-md shrink-0">
                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center">
                      {leader.photoUrl ? (
                        <img
                          src={leader.photoUrl}
                          alt={leader.name}
                          className="w-full h-full object-cover object-top"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextElementSibling) {
                              (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div
                        className="w-full h-full bg-gradient-to-br from-blue-900 to-slate-900 flex items-center justify-center font-black text-amber-300 text-[10px] sm:text-xs"
                        style={{ display: leader.photoUrl ? 'none' : 'flex' }}
                      >
                        {leader.initials}
                      </div>
                    </div>
                  </div>
                  {/* Leader Name & Designation */}
                  <div className="mt-1 w-full text-center">
                    <div className="text-[8px] sm:text-[9px] font-black text-white truncate leading-tight">
                      {leader.name}
                    </div>
                    <div className="text-[6.5px] sm:text-[7.5px] text-amber-300/90 truncate leading-tight font-medium">
                      {leader.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. HERO SLA TURNAROUND & CONSTITUENCY HEADER */}
          <div className="relative z-10 text-center space-y-0.5 my-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-emerald-500/20 via-emerald-400/30 to-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[9px] sm:text-[11px] font-black shadow-xs">
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
              <span>{t.resolvedBanner} • {turnaroundTime.toUpperCase()} {t.inTurnaround}</span>
            </div>
            <h2 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">
              {org?.name || 'మంగళగిరి శాసనసభ నియోజకవర్గం'}
            </h2>
            <p className="text-[8px] sm:text-[9px] text-amber-200/80 font-medium">
              "{org?.constituencySlogan || 'ప్రజల కోసం... ప్రజా సేవలో...'}"
            </p>
          </div>

          {/* 4. DYNAMIC BEFORE VS AFTER EVIDENCE (SIDE-BY-SIDE OR STACKED VERTICALLY) */}
          {activeLayout === 'stacked' ? (
            /* STACKED VERTICAL LAYOUT (OPTIMAL FOR LANDSCAPE PHOTOS) */
            <div className="relative z-10 flex flex-col gap-1.5 my-1 flex-1">
              {/* Top: BEFORE Card */}
              <div className="flex-1 flex flex-col rounded-xl overflow-hidden border border-red-500/70 bg-black/40 shadow-sm relative min-h-[110px]">
                <div className="bg-red-600/90 text-white text-[8px] sm:text-[9px] font-black px-2 py-0.5 flex items-center justify-between z-10 shrink-0">
                  <span>{t.beforeBadge}</span>
                  <span className="text-[7.5px] opacity-90">{formatDate(ticket.created_at)}</span>
                </div>
                <div className="relative flex-1 bg-slate-900 overflow-hidden flex items-center justify-center">
                  {ticket.before_photo_url ? (
                    <img
                      src={ticket.before_photo_url}
                      alt="Citizen Evidence Before"
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="text-slate-500 text-[9px] text-center p-2 font-medium">
                      Evidence Photo Recorded
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom: AFTER Card */}
              <div className="flex-1 flex flex-col rounded-xl overflow-hidden border border-emerald-500/80 bg-emerald-950/20 shadow-sm relative min-h-[110px]">
                <div className="bg-emerald-600 text-white text-[8px] sm:text-[9px] font-black px-2 py-0.5 flex items-center justify-between z-10 shrink-0">
                  <span>{t.afterBadge}</span>
                  <span className="text-[7.5px] text-emerald-200">{formatDate(ticket.submitted_for_approval_at)}</span>
                </div>
                <div className="relative flex-1 bg-slate-900 overflow-hidden flex items-center justify-center">
                  {ticket.after_photo_url ? (
                    <img
                      src={ticket.after_photo_url}
                      alt="Resolution Proof After"
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="text-emerald-400 text-[9px] text-center p-2 font-medium">
                      Resolution Completed ✓
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* SIDE-BY-SIDE 50% / 50% LAYOUT (OPTIMAL FOR PORTRAIT PHOTOS) */
            <div className="relative z-10 grid grid-cols-2 gap-2 my-1 flex-1 items-stretch">
              {/* Left Card: BEFORE */}
              <div className="flex flex-col rounded-xl overflow-hidden border border-red-500/70 bg-black/40 shadow-sm">
                <div className="bg-red-600/90 text-white text-[8px] sm:text-[9px] font-black px-2 py-0.5 flex items-center justify-between shrink-0">
                  <span>{t.beforeBadge}</span>
                </div>
                <div className="relative flex-1 min-h-[120px] bg-slate-900 overflow-hidden flex items-center justify-center">
                  {ticket.before_photo_url ? (
                    <img
                      src={ticket.before_photo_url}
                      alt="Citizen Evidence Before"
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="text-slate-500 text-[9px] text-center p-2 font-medium">
                      Evidence Photo Recorded
                    </div>
                  )}
                  <div className="absolute bottom-1 right-1 px-1 rounded bg-black/75 text-[7px] text-white/90 font-mono">
                    {formatDate(ticket.created_at)}
                  </div>
                </div>
              </div>

              {/* Right Card: AFTER */}
              <div className="flex flex-col rounded-xl overflow-hidden border border-emerald-500/80 bg-emerald-950/20 shadow-sm">
                <div className="bg-emerald-600 text-white text-[8px] sm:text-[9px] font-black px-2 py-0.5 flex items-center justify-between shrink-0">
                  <span>{t.afterBadge}</span>
                </div>
                <div className="relative flex-1 min-h-[120px] bg-slate-900 overflow-hidden flex items-center justify-center">
                  {ticket.after_photo_url ? (
                    <img
                      src={ticket.after_photo_url}
                      alt="Resolution Proof After"
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="text-emerald-400 text-[9px] text-center p-2 font-medium">
                      Resolution Completed ✓
                    </div>
                  )}
                  <div className="absolute bottom-1 right-1 px-1 rounded bg-emerald-950/90 text-[7px] text-emerald-300 font-mono border border-emerald-500/40">
                    {formatDate(ticket.submitted_for_approval_at)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. GRIEVANCE SUMMARY DOSSIER */}
          <div className="relative z-10 bg-white/5 border border-white/10 rounded-xl p-2 space-y-0.5 backdrop-blur-xs my-0.5">
            <div className="flex items-center justify-between">
              <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-black text-[8.5px] sm:text-[9.5px] uppercase tracking-wide border border-blue-400/30">
                {ticket.category}
              </span>
              <span className="font-mono text-[8.5px] sm:text-[9.5px] text-amber-300 font-bold">
                {t.ticket}: #{ticket.ticket_number}
              </span>
            </div>
            <div className="text-[9px] sm:text-[10px] text-white/90 font-semibold truncate">
              📍 {ticket.location_address || 'నియోజకవర్గ పరిధి'}
            </div>
            <div className="flex items-center justify-between text-[7.5px] sm:text-[8px] text-white/60 pt-0.5 border-t border-white/5">
              <span>{t.gpsVerified}: {ticket.proximity_meters || 22}m ✓</span>
              <span>{ticket.citizen_name}</span>
            </div>
          </div>

          {/* 6. BOTTOM SCAN QR & OFFICIAL RECORD STAMP */}
          <div className="relative z-10 pt-1 border-t border-white/10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white p-0.5 shrink-0 flex items-center justify-center shadow-md">
                <QRCodeSVG value={portalUrl} size={32} level="M" />
              </div>
              <div className="min-w-0 flex flex-col">
                <span className="text-[8.5px] sm:text-[9.5px] font-black text-amber-300 leading-tight">
                  {t.scanTitle}
                </span>
                <span className="text-[7.5px] text-white/70 truncate leading-tight">
                  {t.scanSub}
                </span>
                <span className="text-[6.5px] text-emerald-400 font-mono mt-0.5">
                  Office of {org?.mlaName || 'Sri Ramesh Darisi'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-white/10 px-1.5 py-1 rounded-lg border border-white/10 shrink-0">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span className="text-[7.5px] sm:text-[8px] font-bold text-white uppercase tracking-wider">
                {t.officialPR}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
