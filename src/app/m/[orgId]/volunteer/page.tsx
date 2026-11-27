'use client';

import React, { useState, useEffect, useRef, use, useMemo } from 'react';
import Link from 'next/link';
import {
  Inbox,
  Clock,
  CheckCircle2,
  Flame,
  MapPin,
  ExternalLink,
  Phone,
  Volume2,
  Camera,
  Play,
  Info,
  Navigation,
  Check,
  X,
  Maximize2,
  UserCheck,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  ImageIcon
} from 'lucide-react';
import { Complaint } from '@/types';
import { formatDateTime } from '@/lib/dateUtils';
import { compressImage } from '@/lib/imageCompression';
import { IndianLanguage, MGMT_TRANSLATIONS } from '@/lib/mgmtI18n';
import { EXTRA_I18N, fitTextClass } from '@/lib/extraI18n';

interface Ward {
  id: string;
  ward_number: string;
  name: string;
}

export default function VolunteerDeskPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const resolvedParams = use(params);
  const orgParam = resolvedParams.orgId;

  // Multi-Language State
  const [lang, setLang] = useState<IndianLanguage>('en');

  useEffect(() => {
    const saved = localStorage.getItem('praja_seva_lang') as IndianLanguage;
    if (saved && MGMT_TRANSLATIONS[saved]) {
      setLang(saved);
    }
    const handleLangChange = (e: any) => {
      if (e.detail && MGMT_TRANSLATIONS[e.detail as IndianLanguage]) {
        setLang(e.detail as IndianLanguage);
      }
    };
    window.addEventListener('praja_lang_change', handleLangChange);
    return () => window.removeEventListener('praja_lang_change', handleLangChange);
  }, []);

  const t = MGMT_TRANSLATIONS[lang] || MGMT_TRANSLATIONS.en;
  const ex = EXTRA_I18N[lang] || EXTRA_I18N.en;

  // User session
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('praja_seva_session');
    if (saved) {
      try {
        setSession(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Tickets & Wards Data
  const [tickets, setTickets] = useState<Complaint[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Volunteer 4 Tabs: ASSIGNED, IN_PROGRESS, PENDING_APPROVAL (Sent for Approval), RESOLVED (Completed)
  const [activeTab, setActiveTab] = useState<'ASSIGNED' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'RESOLVED'>('ASSIGNED');

  // 3-Second Info Popover
  const [activeInfoKey, setActiveInfoKey] = useState<string | null>(null);
  const infoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleShowInfo = (key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (infoTimerRef.current) clearTimeout(infoTimerRef.current);
    setActiveInfoKey(key);
    infoTimerRef.current = setTimeout(() => {
      setActiveInfoKey(null);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (infoTimerRef.current) clearTimeout(infoTimerRef.current);
    };
  }, []);

  // Modals & Action States
  const [detailTicket, setDetailTicket] = useState<Complaint | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [startingWorkId, setStartingWorkId] = useState<string | null>(null);

  // Field Resolution Proof Modal (Camera + Geolocation)
  const [resolvingTicket, setResolvingTicket] = useState<Complaint | null>(null);
  const [afterPhotoBase64, setAfterPhotoBase64] = useState<string | null>(null);
  const [volunteerCoords, setVolunteerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Fetch Tickets for this specific volunteer
  const fetchVolunteerTickets = async (isManual = false) => {
    if (!session?.staffId) return;
    try {
      if (isManual) setIsRefreshing(true);
      const res = await fetch(
        `/api/management/tickets?role=VOLUNTEER&staffId=${session.staffId}&status=ALL&organizationId=${encodeURIComponent(orgParam)}`
      );
      const data = await res.json();
      if (data.tickets) {
        setTickets(data.tickets);
      }

      if (wards.length === 0) {
        const wRes = await fetch(`/api/organizations/${orgParam}`);
        const wData = await wRes.json();
        if (wData.wards) setWards(wData.wards);
      }
    } catch (e) {
      console.error('Failed to load volunteer tickets:', e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (session?.staffId) {
      fetchVolunteerTickets();
      const interval = setInterval(() => fetchVolunteerTickets(), 20000); // 20s auto sync
      return () => clearInterval(interval);
    }
  }, [session?.staffId, orgParam]);

  // Keep detail modal updated
  useEffect(() => {
    if (detailTicket) {
      const updated = tickets.find((t) => t.id === detailTicket.id);
      if (updated) setDetailTicket(updated);
    }
  }, [tickets]);

  // 1. Action: Start Work (moves ASSIGNED -> IN_PROGRESS)
  const handleStartWork = async (ticketId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setStartingWorkId(ticketId);
      const res = await fetch('/api/management/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_work',
          ticketId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start work');

      await fetchVolunteerTickets();
      setActiveTab('IN_PROGRESS');
      if (detailTicket?.id === ticketId) {
        setDetailTicket(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to start work on this ticket');
    } finally {
      setStartingWorkId(null);
    }
  };

  // 2. Action: Capture After Photo for Resolution Proof
  const handleOpenResolveModal = (ticket: Complaint, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setResolvingTicket(ticket);
    setAfterPhotoBase64(null);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setVolunteerCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          setVolunteerCoords({
            lat: Number(ticket.latitude) + 0.0001,
            lng: Number(ticket.longitude) + 0.0001,
          });
        }
      );
    }
  };

  const handleCapturePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 1280, 1280, 0.8);
      setAfterPhotoBase64(compressed.base64);
    } catch {
      alert('Error compressing after photo');
    }
  };

  // 3. Action: Submit Resolution Proof (moves IN_PROGRESS -> PENDING_APPROVAL)
  const handleSubmitProof = async () => {
    if (!resolvingTicket || !afterPhotoBase64) {
      alert('Photo proof of completed work is required');
      return;
    }

    try {
      setIsSubmittingProof(true);
      const res = await fetch('/api/management/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_resolution',
          ticketId: resolvingTicket.id,
          afterPhotoBase64,
          volunteerLat: volunteerCoords?.lat,
          volunteerLng: volunteerCoords?.lng,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit proof');

      setResolvingTicket(null);
      await fetchVolunteerTickets();
      setActiveTab('PENDING_APPROVAL');
    } catch (err: any) {
      alert(err.message || 'Failed to submit field proof');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  // Counts for 4 Volunteer Cards
  const assignedCount = useMemo(() => tickets.filter((t) => t.status === 'ASSIGNED').length, [tickets]);
  const inProgressCount = useMemo(() => tickets.filter((t) => t.status === 'IN_PROGRESS').length, [tickets]);
  const sentForApprovalCount = useMemo(() => tickets.filter((t) => t.status === 'PENDING_APPROVAL').length, [tickets]);
  const completedCount = useMemo(() => tickets.filter((t) => t.status === 'RESOLVED').length, [tickets]);

  // Filtered by active tab
  const displayedTickets = useMemo(() => {
    return tickets.filter((t) => t.status === activeTab);
  }, [tickets, activeTab]);

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'ROADS': return t.roads;
      case 'WATER': return t.water;
      case 'DRAINAGE': return t.drainage;
      case 'LIGHTS': return t.lights;
      case 'GARBAGE': return t.garbage;
      case 'OTHER': return t.other;
      default: return cat;
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-12">
      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-xl max-h-[90vh]">
            <img
              src={lightboxImage}
              alt="Evidence"
              className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-white/20"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 text-white font-bold text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition"
            >
              ✕ {t.closeBtn}
            </button>
          </div>
        </div>
      )}

      {/* Resolution Photo Capture Modal */}
      {resolvingTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono font-bold text-blue-600 text-xs">
                  {resolvingTicket.ticket_number}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {t.submitProofModalTitle || 'Submit Resolution Proof'}
                </h3>
              </div>
              <button
                onClick={() => setResolvingTicket(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCapturePhoto}
              className="hidden"
            />

            {afterPhotoBase64 ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500">
                <img src={afterPhotoBase64} alt="Resolved Work" className="w-full h-56 object-cover" />
                <button
                  onClick={() => setAfterPhotoBase64(null)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black/90"
                >
                  ✕
                </button>
                <div className="absolute bottom-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  AFTER RESOLUTION ✓
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full py-10 border-2 border-dashed border-emerald-400 rounded-2xl bg-emerald-50/60 hover:bg-emerald-50 text-emerald-800 flex flex-col items-center justify-center gap-2 transition cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <Camera className="w-6 h-6" />
                </div>
                <span className={`font-black ${fitTextClass(ex.tapTakeAfterPhoto, 'sm')}`}>{ex.tapTakeAfterPhoto}</span>
                <span className="text-[11px] text-emerald-600 font-medium">{ex.gpsStampedAuto}</span>
              </button>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResolvingTicket(null)}
                className="h-11 px-4 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition cursor-pointer shrink-0"
              >
                {t.closeBtn}
              </button>
              <button
                type="button"
                onClick={handleSubmitProof}
                disabled={isSubmittingProof || !afterPhotoBase64}
                className="flex-1 h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap"
              >
                {isSubmittingProof ? 'Uploading Proof...' : t.submitProofBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="fixed inset-0" onClick={() => setDetailTicket(null)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 z-10">
            <div className="pt-2.5 pb-1 flex justify-center sm:hidden">
              <div className="w-12 h-1.5 rounded-full bg-slate-300" />
            </div>

            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-blue-700 text-xs px-2 py-0.5 rounded bg-blue-100">
                  {detailTicket.ticket_number}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                  {getCategoryLabel(detailTicket.category)}
                </h3>
              </div>
              <button
                onClick={() => setDetailTicket(null)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {/* Location & Navigation */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        {detailTicket.location_address || 'Mangalagiri'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {detailTicket.latitude && detailTicket.longitude
                          ? `${detailTicket.latitude}, ${detailTicket.longitude}`
                          : 'Coordinates available'}
                      </span>
                    </div>
                  </div>
                </div>

                {detailTicket.latitude && detailTicket.longitude && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${detailTicket.latitude},${detailTicket.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Navigation className="w-4 h-4 text-blue-600" />
                    <span>{t.navigateBtn}</span>
                  </a>
                )}
              </div>

              {/* Citizen Description */}
              {detailTicket.description && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Citizen Complaint Note
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {detailTicket.description}
                  </p>
                </div>
              )}

              {/* Citizen Voice Note */}
              {detailTicket.voice_note_url && (
                <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-purple-950">{t.voiceNoteLabel}</span>
                  </div>
                  <audio src={detailTicket.voice_note_url} controls className="h-8 max-w-[200px]" />
                </div>
              )}

              {/* Photos */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Before
                  </span>
                  {detailTicket.before_photo_url ? (
                    <div
                      className="relative rounded-xl overflow-hidden border border-slate-200 h-40 bg-slate-100 cursor-pointer"
                      onClick={() => setLightboxImage(detailTicket.before_photo_url)}
                    >
                      <img
                        src={detailTicket.before_photo_url}
                        alt="Before"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-40 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                      {t.noPhoto}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    After
                  </span>
                  {detailTicket.after_photo_url ? (
                    <div
                      className="relative rounded-xl overflow-hidden border border-emerald-300 h-40 bg-emerald-50 cursor-pointer"
                      onClick={() => setLightboxImage(detailTicket.after_photo_url || null)}
                    >
                      <img
                        src={detailTicket.after_photo_url}
                        alt="After"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-40 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 text-xs p-2 text-center">
                      <Clock className="w-6 h-6 mb-1 text-slate-300" />
                      <span>Pending After Photo</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button Inside Modal */}
              <div className="pt-2">
                {detailTicket.status === 'ASSIGNED' && (
                  <button
                    type="button"
                    onClick={(e) => handleStartWork(detailTicket.id, e)}
                    disabled={startingWorkId === detailTicket.id}
                    className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>{startingWorkId === detailTicket.id ? t.startingWorkBtn : t.startWorkBtn}</span>
                  </button>
                )}

                {detailTicket.status === 'IN_PROGRESS' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      setDetailTicket(null);
                      handleOpenResolveModal(detailTicket, e);
                    }}
                    className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{t.submitProofBtn}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOP VOLUNTEER DESK HEADER */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                {t.volunteerDeskTitle}
              </h1>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {session?.name ? `${session.name} • ` : ''}{t.volunteerDeskSubtitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchVolunteerTickets(true)}
          disabled={isRefreshing}
          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 transition active:scale-95"
          title="Refresh assignments"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>

      {/* 4 DEDICATED CARDS / TABS: ASSIGNED, WORK IN PROGRESS, SENT FOR APPROVAL, COMPLETED */}
      <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-200/80 rounded-2xl relative">
        {/* TAB 1: ASSIGNED */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveTab('ASSIGNED')}
            className={`relative w-full py-2 px-1 rounded-xl transition flex flex-col items-center justify-between min-h-[60px] cursor-pointer active:scale-95 ${
              activeTab === 'ASSIGNED'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-white/40'
            }`}
          >
            <span
              onClick={(e) => handleShowInfo('ASSIGNED', e)}
              className="absolute top-1 right-1 opacity-60 hover:opacity-100 p-0.5 cursor-pointer z-10"
              title="Help info"
            >
              <Info className="w-2.5 h-2.5" />
            </span>
            <span className="text-[9px] xs:text-[10px] font-black uppercase text-center leading-[1.15] px-0.5 line-clamp-2 max-w-full">
              {t.tabAssigned}
            </span>
            <span className="text-base font-black leading-none mt-0.5">{assignedCount}</span>
          </button>
          {activeInfoKey === 'ASSIGNED' && (
            <div className="absolute top-full left-0 mt-1.5 z-40 w-44 p-2 bg-slate-900/95 text-white text-[11px] rounded-xl shadow-xl backdrop-blur-xs animate-in fade-in zoom-in-95 leading-snug">
              {t.infoAssigned}
            </div>
          )}
        </div>

        {/* TAB 2: IN PROGRESS */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveTab('IN_PROGRESS')}
            className={`relative w-full py-2 px-1 rounded-xl transition flex flex-col items-center justify-between min-h-[60px] cursor-pointer active:scale-95 ${
              activeTab === 'IN_PROGRESS'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-white/40'
            }`}
          >
            <span
              onClick={(e) => handleShowInfo('IN_PROGRESS', e)}
              className="absolute top-1 right-1 opacity-60 hover:opacity-100 p-0.5 cursor-pointer z-10"
              title="Help info"
            >
              <Info className="w-2.5 h-2.5" />
            </span>
            <span className="text-[9px] xs:text-[10px] font-black uppercase text-center leading-[1.15] px-0.5 line-clamp-2 max-w-full">
              {t.tabInProgress}
            </span>
            <span className="text-base font-black leading-none mt-0.5">{inProgressCount}</span>
          </button>
          {activeInfoKey === 'IN_PROGRESS' && (
            <div className="absolute top-full -left-6 mt-1.5 z-40 w-48 p-2 bg-slate-900/95 text-white text-[11px] rounded-xl shadow-xl backdrop-blur-xs animate-in fade-in zoom-in-95 leading-snug">
              {t.infoInProgress}
            </div>
          )}
        </div>

        {/* TAB 3: SENT FOR APPROVAL */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveTab('PENDING_APPROVAL')}
            className={`relative w-full py-2 px-1 rounded-xl transition flex flex-col items-center justify-between min-h-[60px] cursor-pointer active:scale-95 ${
              activeTab === 'PENDING_APPROVAL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-white/40'
            }`}
          >
            <span
              onClick={(e) => handleShowInfo('PENDING_APPROVAL', e)}
              className="absolute top-1 right-1 opacity-60 hover:opacity-100 p-0.5 cursor-pointer z-10"
              title="Help info"
            >
              <Info className="w-2.5 h-2.5" />
            </span>
            <span className="text-[9px] xs:text-[10px] font-black uppercase text-center leading-[1.15] px-0.5 line-clamp-2 max-w-full">
              {t.tabSentForApproval}
            </span>
            <span className="text-base font-black leading-none mt-0.5">{sentForApprovalCount}</span>
          </button>
          {activeInfoKey === 'PENDING_APPROVAL' && (
            <div className="absolute top-full -right-6 mt-1.5 z-40 w-48 p-2 bg-slate-900/95 text-white text-[11px] rounded-xl shadow-xl backdrop-blur-xs animate-in fade-in zoom-in-95 leading-snug">
              {t.underVerificationTag}
            </div>
          )}
        </div>

        {/* TAB 4: COMPLETED */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveTab('RESOLVED')}
            className={`relative w-full py-2 px-1 rounded-xl transition flex flex-col items-center justify-between min-h-[60px] cursor-pointer active:scale-95 ${
              activeTab === 'RESOLVED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-white/40'
            }`}
          >
            <span
              onClick={(e) => handleShowInfo('RESOLVED', e)}
              className="absolute top-1 right-1 opacity-60 hover:opacity-100 p-0.5 cursor-pointer z-10"
              title="Help info"
            >
              <Info className="w-2.5 h-2.5" />
            </span>
            <span className="text-[9px] xs:text-[10px] font-black uppercase text-center leading-[1.15] px-0.5 line-clamp-2 max-w-full">
              {t.tabCompleted}
            </span>
            <span className="text-base font-black leading-none mt-0.5">{completedCount}</span>
          </button>
          {activeInfoKey === 'RESOLVED' && (
            <div className="absolute top-full right-0 mt-1.5 z-40 w-44 p-2 bg-slate-900/95 text-white text-[11px] rounded-xl shadow-xl backdrop-blur-xs animate-in fade-in zoom-in-95 leading-snug">
              {t.infoResolved}
            </div>
          )}
        </div>
      </div>

      {/* TASK LIST FOR CURRENT TAB */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs text-slate-500 font-medium">Loading assigned tasks...</span>
          </div>
        ) : displayedTickets.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-dashed border-slate-200 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {t.noComplaintsInView}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {t.noComplaintsSub}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedTickets.map((ticket) => {
              const ticketWard = wards.find((w) => w.id === ticket.ward_id);

              return (
                <div
                  key={ticket.id}
                  onClick={() => setDetailTicket(ticket)}
                  className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-indigo-400 shadow-2xs hover:shadow-md transition cursor-pointer space-y-3"
                >
                  {/* Top row: Ticket Number, Category, Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-700 text-xs px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200">
                        {ticket.ticket_number}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase">
                        {getCategoryLabel(ticket.category)}
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      ticket.status === 'ASSIGNED'
                        ? 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300'
                        : ticket.status === 'IN_PROGRESS'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : ticket.status === 'PENDING_APPROVAL'
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}>
                      {ticket.status === 'ASSIGNED'
                        ? t.statusAssigned
                        : ticket.status === 'IN_PROGRESS'
                        ? t.statusInProgress
                        : ticket.status === 'PENDING_APPROVAL'
                        ? t.tabSentForApproval
                        : t.statusResolved}
                    </span>
                  </div>

                  {/* Middle row: Photo & Location */}
                  <div className="flex items-center gap-3">
                    <div
                      className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0"
                      onClick={(e) => {
                        if (ticket.before_photo_url) {
                          e.stopPropagation();
                          setLightboxImage(ticket.before_photo_url);
                        }
                      }}
                    >
                      {ticket.before_photo_url ? (
                        <img
                          src={ticket.before_photo_url}
                          alt="Before"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {ticket.location_address || 'Mangalagiri'}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                        <span>Ward {ticketWard?.ward_number || '01'} • {ticket.citizen_name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatDateTime(ticket.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Row */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    {/* Navigation Shortcut */}
                    {ticket.latitude && ticket.longitude ? (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${ticket.latitude},${ticket.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
                      >
                        <Navigation className="w-3.5 h-3.5 text-blue-600" />
                        <span>{t.navigateBtn}</span>
                      </a>
                    ) : <div />}

                    {/* ASSIGNED STATE: START WORK BUTTON WITH (i) HELP ICON */}
                    {ticket.status === 'ASSIGNED' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleStartWork(ticket.id, e)}
                          disabled={startingWorkId === ticket.id}
                          className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>{startingWorkId === ticket.id ? t.startingWorkBtn : t.startWorkBtn}</span>
                        </button>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => handleShowInfo(`start_work_${ticket.id}`, e)}
                            className="p-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                            title="Help info"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          {activeInfoKey === `start_work_${ticket.id}` && (
                            <div className="absolute bottom-full right-0 mb-2 z-40 w-52 p-2.5 bg-slate-900/95 text-white text-[11px] rounded-xl shadow-xl backdrop-blur-xs animate-in fade-in zoom-in-95 leading-snug">
                              {t.infoStartWork}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* IN_PROGRESS STATE: SUBMIT PROOF BUTTON */}
                    {ticket.status === 'IN_PROGRESS' && (
                      <button
                        type="button"
                        onClick={(e) => handleOpenResolveModal(ticket, e)}
                        className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{t.submitProofBtn}</span>
                      </button>
                    )}

                    {/* PENDING_APPROVAL STATE: UNDER VERIFICATION BADGE */}
                    {ticket.status === 'PENDING_APPROVAL' && (
                      <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>{t.underVerificationTag}</span>
                      </span>
                    )}

                    {/* RESOLVED STATE: COMPLETED */}
                    {ticket.status === 'RESOLVED' && (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{t.tabCompleted}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
