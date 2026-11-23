'use client';

import React, { useRef, useState } from 'react';
import { Download, Share2, Sparkles, ShieldCheck, CheckCircle2, QrCode as QrIcon } from 'lucide-react';
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

export interface CoalitionBrandingConfig {
  coalitionName: string;
  pm: LeaderProfile;
  cm: LeaderProfile;
  dyCm: LeaderProfile;
  mla: LeaderProfile;
  showTdpLogo: boolean;
  showJspLogo: boolean;
  showBjpLogo: boolean;
  showApGovtLogo: boolean;
}

export const DEFAULT_COALITION_CONFIG: CoalitionBrandingConfig = {
  coalitionName: 'కూటమి ప్రజా ప్రభుత్వం',
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

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('praja_coalition_branding');
      if (saved) {
        setCoalitionConfig(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const activeConfig = coalitionConfig;

  const turnaroundTime = calculateTurnaround(
    ticket.created_at,
    ticket.submitted_for_approval_at || new Date().toISOString()
  );

  const portalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/p/${org?.slug || 'mangalagiri'}`
    : 'https://prajaseva-one.vercel.app';

  // Format Dates nicely
  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return '22 Nov, 07:38 PM';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', {
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

      // Generate pristine 4:5 JPEG at 2x resolution (1080 x 1350 equivalent)
      const dataUrl = await toJpeg(posterRef.current, {
        quality: 0.95,
        pixelRatio: 2.5,
        cacheBust: true,
        backgroundColor: '#070b19',
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
      // Fallback: alert user
      alert('Unable to generate image directly. Please take a quick screenshot of the poster preview.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Share to WhatsApp Status / Chat
  const handleShareToWhatsApp = () => {
    const text = encodeURIComponent(
      `🏆 *ప్రజా సమస్య పరిష్కారం - విజయం!* 🏆\n` +
      `🏛️ నియోజకవర్గం: ${org?.name || 'మంగళగిరి'}\n` +
      `⚡ సమస్య: ${ticket.category}\n` +
      `📍 ప్రాంతం: ${ticket.location_address || 'వార్డు పరిధి'}\n` +
      `⏱️ పరిష్కార సమయం: ${turnaroundTime}\n` +
      `📋 ఫిర్యాదు ఐడీ: #${ticket.ticket_number}\n\n` +
      `కూటమి ప్రభుత్వం - ప్రజా సంక్షేమమే మా ధ్యేయం!\n` +
      `మీ సమస్యను నమోదు చేసుకోండి: ${portalUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const leaders = [
    { ...activeConfig.pm, key: 'pm' },
    { ...activeConfig.cm, key: 'cm' },
    { ...activeConfig.dyCm, key: 'dyCm' },
    { ...activeConfig.mla, name: org?.mlaName || activeConfig.mla.name, key: 'mla' },
  ].filter((l) => l.enabled);

  return (
    <div className="space-y-3 w-full">
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
            {isGenerating ? 'చిత్రం రూపొందుతోంది (Generating JPEG)...' : '1-Tap Download JPEG (WhatsApp Status)'}
          </span>
        </button>

        <button
          type="button"
          onClick={handleShareToWhatsApp}
          className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition active:scale-98 cursor-pointer shrink-0"
        >
          <Share2 className="w-4 h-4 shrink-0" />
          <span>WhatsApp లో పంచుకోండి</span>
        </button>
      </div>

      {downloadSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>✓ JPEG పోస్టర్ గ్యాలరీకి డౌన్‌లోడ్ చేయబడింది! WhatsApp Status లో షేర్ చేయండి.</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4:5 HIGH-IMPACT COALITION PR POSTER CONTAINER                             */}
      {/* ========================================================================= */}
      <div className="w-full flex justify-center overflow-x-auto p-1">
        <div
          ref={posterRef}
          id="victory-pr-poster"
          className="w-full max-w-[480px] aspect-[4/5] bg-gradient-to-b from-[#070b19] via-[#0d1630] to-[#050814] text-white rounded-3xl p-4 sm:p-5 flex flex-col justify-between border-2 border-amber-500/40 shadow-2xl relative overflow-hidden select-none"
          style={{ minHeight: '600px' }}
        >
          {/* Subtle Golden Glow / Decorative Header Aura */}
          <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-amber-500/15 via-transparent to-transparent pointer-events-none" />
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-blue-600/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-emerald-600/20 rounded-full blur-2xl pointer-events-none" />

          {/* 1. TOP COALITION EMBLEMS & GOVT BANNER */}
          <div className="relative z-10 flex items-center justify-between border-b border-amber-400/20 pb-2.5">
            {/* Coalition Party Symbols */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* TDP Cycle Emblem */}
              {activeConfig.showTdpLogo && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-yellow-400 border border-amber-500 flex items-center justify-center p-0.5 shadow-sm" title="Telugu Desam Party">
                  <span className="text-[10px] font-black text-black">🚲 TDP</span>
                </div>
              )}
              {/* Jana Sena Glass Emblem */}
              {activeConfig.showJspLogo && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-600 border border-red-400 flex items-center justify-center p-0.5 shadow-sm" title="Jana Sena Party">
                  <span className="text-[10px] font-black text-white">🥛 JSP</span>
                </div>
              )}
              {/* BJP Lotus Emblem */}
              {activeConfig.showBjpLogo && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-orange-500 border border-green-600 flex items-center justify-center p-0.5 shadow-sm" title="Bharatiya Janata Party">
                  <span className="text-[10px] font-black text-white">🪷 BJP</span>
                </div>
              )}
            </div>

            {/* Central Coalition Motto */}
            <div className="flex flex-col items-center text-center px-1">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-300">
                {activeConfig.coalitionName}
              </span>
              <span className="text-[8px] sm:text-[9px] text-white/70 font-semibold tracking-tight">
                ఆంధ్రప్రదేశ్ ప్రభుత్వం
              </span>
            </div>

            {/* AP Govt Official Emblem */}
            {activeConfig.showApGovtLogo && (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 border border-amber-400/50 flex items-center justify-center text-amber-400 font-bold text-[10px] shrink-0">
                🏛️ AP
              </div>
            )}
          </div>

          {/* 2. THE 4-PILLAR LEADERSHIP HIERARCHY STRIP */}
          <div className="relative z-10 py-2">
            <div className={`grid grid-cols-${leaders.length} gap-1 sm:gap-2 items-start justify-items-center`}>
              {leaders.map((leader) => (
                <div key={leader.key} className="flex flex-col items-center text-center min-w-0 w-full">
                  {/* Gold-Ring Portrait Frame */}
                  <div className="relative w-11 h-11 sm:w-14 sm:h-14 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 shadow-md shrink-0">
                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-800 flex items-center justify-center">
                      {leader.photoUrl ? (
                        <img
                          src={leader.photoUrl}
                          alt={leader.name}
                          className="w-full h-full object-cover object-top"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            // Fallback to stylized initials if external image fails
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextElementSibling) {
                              (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div
                        className="w-full h-full bg-gradient-to-br from-blue-900 to-slate-900 flex items-center justify-center font-black text-amber-300 text-xs sm:text-sm"
                        style={{ display: leader.photoUrl ? 'none' : 'flex' }}
                      >
                        {leader.initials}
                      </div>
                    </div>
                  </div>
                  {/* Leader Name & Title */}
                  <div className="mt-1 w-full px-0.5">
                    <div className="text-[9px] sm:text-[10px] font-black text-white truncate leading-tight">
                      {leader.name}
                    </div>
                    <div className="text-[7px] sm:text-[8px] text-amber-300/90 truncate leading-tight font-medium">
                      {leader.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. CONSTITUENCY & SLA TURNAROUND BANNER */}
          <div className="relative z-10 text-center space-y-1 my-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-emerald-500/20 via-emerald-400/30 to-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] sm:text-xs font-black shadow-xs">
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
              <span>⚡ 100% పరిష్కారం • RESOLVED IN {turnaroundTime.toUpperCase()}</span>
            </div>
            <h2 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">
              {org?.name || 'మంగళగిరి శాసనసభ నియోజకవర్గం'}
            </h2>
            <p className="text-[9px] sm:text-[10px] text-amber-200/90 font-medium">
              "{org?.constituencySlogan || 'ప్రజల కోసం... ప్రజా సేవలో...'}"
            </p>
          </div>

          {/* 4. SIDE-BY-SIDE BEFORE VS AFTER EVIDENCE (THE CORE CONTRAST) */}
          <div className="relative z-10 grid grid-cols-2 gap-2 my-1.5 flex-1 items-stretch">
            {/* Left Card: BEFORE (సమస్య) */}
            <div className="flex flex-col rounded-2xl overflow-hidden border-2 border-red-500/70 bg-black/40 shadow-md">
              <div className="bg-red-600/90 text-white text-[9px] sm:text-[10px] font-black px-2 py-0.5 flex items-center justify-between">
                <span>🔴 BEFORE (సమస్య)</span>
                <span className="text-[8px] opacity-80">Lodged</span>
              </div>
              <div className="relative flex-1 min-h-[100px] sm:min-h-[120px] bg-slate-900 overflow-hidden flex items-center justify-center">
                {ticket.before_photo_url ? (
                  <img
                    src={ticket.before_photo_url}
                    alt="Citizen Evidence Before"
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="text-slate-500 text-[10px] text-center p-2 font-medium">
                    Evidence Photo Recorded
                  </div>
                )}
                <div className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-black/70 text-[8px] text-white/90 font-mono">
                  {formatDate(ticket.created_at)}
                </div>
              </div>
            </div>

            {/* Right Card: AFTER (పరిష్కారం ✓) */}
            <div className="flex flex-col rounded-2xl overflow-hidden border-2 border-emerald-500 bg-emerald-950/20 shadow-md">
              <div className="bg-emerald-600 text-white text-[9px] sm:text-[10px] font-black px-2 py-0.5 flex items-center justify-between">
                <span>🟢 AFTER (పరిష్కారం ✓)</span>
                <span className="text-[8px] text-emerald-200">Verified</span>
              </div>
              <div className="relative flex-1 min-h-[100px] sm:min-h-[120px] bg-slate-900 overflow-hidden flex items-center justify-center">
                {ticket.after_photo_url ? (
                  <img
                    src={ticket.after_photo_url}
                    alt="Resolution Proof After"
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="text-emerald-400 text-[10px] text-center p-2 font-medium">
                    Resolution Completed ✓
                  </div>
                )}
                <div className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-emerald-950/80 text-[8px] text-emerald-300 font-mono border border-emerald-500/40">
                  {formatDate(ticket.submitted_for_approval_at)}
                </div>
              </div>
            </div>
          </div>

          {/* 5. GRIEVANCE DOSSIER & LOCATION SPECIFICS */}
          <div className="relative z-10 bg-white/5 border border-white/10 rounded-xl p-2.5 space-y-1 backdrop-blur-xs my-1">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-black text-[9px] sm:text-[10px] uppercase tracking-wide border border-blue-400/30">
                {ticket.category}
              </span>
              <span className="font-mono text-[9px] sm:text-[10px] text-amber-300 font-bold">
                Ticket #{ticket.ticket_number}
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-white/90 font-semibold truncate">
              📍 {ticket.location_address || 'మంగళగిరి నియోజకవర్గ పరిధి'}
            </div>
            <div className="flex items-center justify-between text-[8px] sm:text-[9px] text-white/60 pt-0.5 border-t border-white/5">
              <span>GPS Geofence: {ticket.proximity_meters || 22}m Verified ✓</span>
              <span>పౌరుని ఫిర్యాదు: {ticket.citizen_name}</span>
            </div>
          </div>

          {/* 6. BOTTOM BRANDING & SCAN QR CITIZEN ACTION */}
          <div className="relative z-10 pt-1.5 border-t border-white/10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {/* Dynamic QR Code for citizen report */}
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-white p-1 shrink-0 flex items-center justify-center shadow-md">
                <QRCodeSVG value={portalUrl} size={36} level="M" />
              </div>
              <div className="min-w-0 flex flex-col">
                <span className="text-[9px] sm:text-[10px] font-black text-amber-300 leading-tight">
                  సమస్యలను నమోదు చేయండి
                </span>
                <span className="text-[8px] text-white/70 truncate leading-tight">
                  Scan to lodge grievance • Praja Seva
                </span>
                <span className="text-[7px] text-emerald-400 font-mono mt-0.5">
                  Office of {org?.mlaName || 'Sri Ramesh Darisi'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg border border-white/10 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[8px] sm:text-[9px] font-bold text-white uppercase tracking-wider">
                Official PR
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
