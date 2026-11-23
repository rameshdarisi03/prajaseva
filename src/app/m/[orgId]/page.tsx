'use client';

import React, { useState, useEffect, useRef, use, useMemo } from 'react';
import Link from 'next/link';
import {
  Inbox,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  Flame,
  Droplet,
  Lightbulb,
  Trash,
  Zap,
  MapPin,
  ExternalLink,
  Phone,
  Volume2,
  Camera,
  RotateCcw,
  UserCheck,
  ChevronRight,
  ShieldAlert,
  Navigation,
  Download,
  Check,
  X,
  Maximize2,
  User,
  ArrowUpRight,
  ImageIcon
} from 'lucide-react';
import { Complaint, ComplaintCategory } from '@/types';
import { formatDateTime, calculateTurnaround } from '@/lib/dateUtils';
import { compressImage } from '@/lib/imageCompression';
import { IndianLanguage, MGMT_TRANSLATIONS } from '@/lib/mgmtI18n';

interface Ward {
  id: string;
  ward_number: string;
  name: string;
}

export default function OperationsBoardPage({
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

  // Tickets & Wards Data
  const [allTickets, setAllTickets] = useState<Complaint[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: driven by top 3 cards (NEW, IN_PROGRESS, RESOLVED)
  const [activeTab, setActiveTab] = useState<'NEW' | 'IN_PROGRESS' | 'RESOLVED'>('NEW');

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWardId, setSelectedWardId] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Selected Ticket for Full Details Modal
  const [detailTicket, setDetailTicket] = useState<Complaint | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Volunteer Proof Submission Modal (for In-Progress -> QA Gate)
  const [resolvingTicket, setResolvingTicket] = useState<Complaint | null>(null);
  const [afterPhotoBase64, setAfterPhotoBase64] = useState<string | null>(null);
  const [volunteerCoords, setVolunteerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Assignment Loading State
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedVolunteerMap, setSelectedVolunteerMap] = useState<Record<string, string>>({});

  // 1. Fetch Tickets, Wards & Volunteers
  const fetchData = async () => {
    try {
      setLoading(true);
      const tRes = await fetch(`/api/management/tickets?role=ADMIN&status=ALL`);
      const tData = await tRes.json();
      if (tData.tickets) setAllTickets(tData.tickets);
      if (tData.volunteers) setVolunteers(tData.volunteers);

      const wRes = await fetch(`/api/organizations/${orgParam}`);
      const wData = await wRes.json();
      if (wData.wards) setWards(wData.wards);
    } catch (e) {
      console.error('Failed to load board data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, [orgParam]);

  // Keep detailTicket in sync with latest data
  useEffect(() => {
    if (detailTicket) {
      const updated = allTickets.find((t) => t.id === detailTicket.id);
      if (updated) setDetailTicket(updated);
    }
  }, [allTickets]);

  // 2. Assign Ticket to Volunteer (uses term "Assign")
  const handleAssignVolunteer = async (ticketId: string) => {
    const volId = selectedVolunteerMap[ticketId] || volunteers[0]?.id;
    if (!volId) {
      alert('Please select a volunteer to assign');
      return;
    }

    try {
      setAssigningId(ticketId);
      const res = await fetch('/api/management/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign',
          ticketId,
          volunteerId: volId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to assign volunteer');
    } finally {
      setAssigningId(null);
    }
  };

  // 3. Volunteer Submits Resolution Proof
  const handleOpenResolveModal = (ticket: Complaint) => {
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

  const handleCaptureAfterPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await compressImage(file, 1280, 1280, 0.8);
      setAfterPhotoBase64(res.base64);
    } catch {
      alert('Error compressing after photo');
    }
  };

  const handleSubmitProof = async () => {
    if (!resolvingTicket || !afterPhotoBase64) {
      alert('Resolution photo evidence is required');
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
      if (!res.ok) throw new Error(data.error);

      setResolvingTicket(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit field proof');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  // 4. Counts by Status
  const newCount = allTickets.filter((t) => t.status === 'NEW').length;
  const inProgressCount = allTickets.filter((t) => t.status === 'IN_PROGRESS').length;
  const pendingReviewCount = allTickets.filter((t) => t.status === 'PENDING_APPROVAL').length;
  const resolvedCount = allTickets.filter((t) => t.status === 'RESOLVED').length;

  // 5. Filter Tickets Based on Active Top Card + Search + Ward + Category
  const displayedTickets = useMemo(() => {
    return allTickets.filter((t) => {
      // Status filter driven by active top card
      if (t.status !== activeTab) {
        return false;
      }

      // Ward filter
      if (selectedWardId !== 'ALL' && t.ward_id !== selectedWardId) return false;

      // Category filter
      if (selectedCategory !== 'ALL' && t.category !== selectedCategory) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTicket = t.ticket_number?.toLowerCase().includes(q);
        const matchName = t.citizen_name?.toLowerCase().includes(q);
        const matchPhone = t.citizen_phone?.includes(q);
        const matchAddress = t.location_address?.toLowerCase().includes(q);
        const matchCategory = t.category?.toLowerCase().includes(q);
        if (!matchTicket && !matchName && !matchPhone && !matchAddress && !matchCategory) return false;
      }

      return true;
    });
  }, [allTickets, activeTab, selectedWardId, selectedCategory, searchQuery]);

  // Category translation helper
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
    <div className="space-y-5 pb-16">
      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={lightboxImage}
              alt="Enlarged Evidence"
              className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-white/20"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 text-white font-bold text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition"
            >
              ✕ {t.closeBtn}
            </button>
          </div>
        </div>
      )}

      {/* Volunteer Resolution Modal */}
      {resolvingTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
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

            {/* Photo Capture */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCaptureAfterPhoto}
              className="hidden"
            />

            {afterPhotoBase64 ? (
              <div className="relative rounded-2xl overflow-hidden border border-emerald-200">
                <img src={afterPhotoBase64} alt="After work" className="w-full h-52 object-cover" />
                <button
                  onClick={() => setAfterPhotoBase64(null)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  ✕
                </button>
                <div className="absolute bottom-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  {t.resolutionPhotoLabel}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-emerald-300 rounded-2xl bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Camera className="w-8 h-8 text-emerald-600" />
                <span className="text-xs font-bold">Tap to Capture Resolution Photo</span>
                <span className="text-[11px] text-slate-400">GPS location stamped automatically</span>
              </button>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResolvingTicket(null)}
                className="h-10 px-4 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition cursor-pointer shrink-0"
              >
                {t.closeBtn}
              </button>
              <button
                type="button"
                onClick={handleSubmitProof}
                disabled={isSubmittingProof || !afterPhotoBase64}
                className="flex-1 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap"
              >
                {isSubmittingProof ? 'Sending...' : (t.submitProofBtn || 'Send for Approval')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FULL TICKET DETAILS MODAL (NATIVE BOTTOM SHEET ON MOBILE)             */}
      {/* ===================================================================== */}
      {detailTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div
            className="fixed inset-0"
            onClick={() => setDetailTicket(null)}
          />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 z-10">
            {/* Mobile Drag Indicator */}
            <div className="pt-2.5 pb-1 flex justify-center sm:hidden">
              <div className="w-12 h-1.5 rounded-full bg-slate-300" />
            </div>

            {/* Header */}
            <div className="px-4 py-3 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-mono font-bold text-blue-700 text-xs sm:text-sm px-2.5 py-1 rounded-lg bg-blue-100 border border-blue-200 shrink-0">
                  {detailTicket.ticket_number}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                    {getCategoryLabel(detailTicket.category)}
                  </h3>
                  <span className="text-[10px] sm:text-xs text-slate-500 block truncate">
                    {formatDateTime(detailTicket.created_at)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border ${
                  detailTicket.status === 'NEW'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : detailTicket.status === 'IN_PROGRESS'
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}>
                  {detailTicket.status === 'NEW' ? t.statusNew : detailTicket.status === 'IN_PROGRESS' ? t.statusInProgress : t.statusResolved}
                </span>
                <button
                  onClick={() => setDetailTicket(null)}
                  className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 pb-8 flex-1">
              {/* Citizen Details */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {t.citizenNameLabel}
                  </span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {detailTicket.citizen_name}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {t.mobileLabel}
                  </span>
                  <a
                    href={`tel:${detailTicket.citizen_phone}`}
                    className="font-mono font-bold text-blue-600 text-sm mt-0.5 flex items-center gap-1.5 hover:underline"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    +91 {detailTicket.citizen_phone}
                  </a>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {t.wardLabel}
                  </span>
                  <div className="font-semibold text-slate-800 text-xs mt-0.5">
                    🏷️ Ward {wards.find(w => w.id === detailTicket.ward_id)?.ward_number || '01'} ({wards.find(w => w.id === detailTicket.ward_id)?.name || 'Central'})
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {t.gpsLabel}
                  </span>
                  <a
                    href={`https://maps.google.com/?q=${detailTicket.latitude},${detailTicket.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <MapPin className="w-3.5 h-3.5 text-red-500" />
                    {Number(detailTicket.latitude).toFixed(4)}°N, {Number(detailTicket.longitude).toFixed(4)}°E
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Landmark */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  {t.landmarkLabel}
                </span>
                <p className="text-slate-800 font-medium">
                  {detailTicket.location_address || 'Mangalagiri Assembly Constituency'}
                </p>
              </div>

              {/* Description */}
              {detailTicket.description && (
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    {t.descriptionLabel}
                  </span>
                  <p className="text-slate-700 leading-relaxed">
                    {detailTicket.description}
                  </p>
                </div>
              )}

              {/* Voice Note Audio */}
              {detailTicket.voice_note_url && (
                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-purple-950">{t.voiceNoteLabel}</span>
                  </div>
                  <audio src={detailTicket.voice_note_url} controls className="h-8 max-w-[240px]" />
                </div>
              )}

              {/* Attached Photos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Before Photo */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    {t.evidencePhotoLabel}
                  </span>
                  {detailTicket.before_photo_url ? (
                    <div
                      className="relative rounded-2xl overflow-hidden border border-slate-200 h-52 bg-slate-100 cursor-pointer group"
                      onClick={() => setLightboxImage(detailTicket.before_photo_url)}
                    >
                      <img
                        src={detailTicket.before_photo_url}
                        alt="Citizen Evidence"
                        className="w-full h-full object-cover group-hover:scale-102 transition"
                      />
                      <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        BEFORE
                      </span>
                      <span className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  ) : (
                    <div className="h-52 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                      {t.noPhoto}
                    </div>
                  )}
                </div>

                {/* After Photo */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">
                    {t.resolutionPhotoLabel}
                  </span>
                  {detailTicket.after_photo_url ? (
                    <div
                      className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 h-52 bg-emerald-50 cursor-pointer group"
                      onClick={() => setLightboxImage(detailTicket.after_photo_url || null)}
                    >
                      <img
                        src={detailTicket.after_photo_url}
                        alt="Resolution Proof"
                        className="w-full h-full object-cover group-hover:scale-102 transition"
                      />
                      <span className="absolute bottom-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        AFTER ✓
                      </span>
                      <span className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  ) : (
                    <div className="h-52 rounded-2xl border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
                      <Clock className="w-8 h-8 mb-1.5 text-slate-300" />
                      <span>{t.pendingResolutionPhoto}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Zone: Assign Volunteer */}
              <div className="pt-3 border-t border-slate-200">
                {detailTicket.status === 'NEW' && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">
                      {t.assignVolunteerTitle}
                    </span>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <div className="relative w-full sm:flex-1 min-w-0">
                        <select
                          value={selectedVolunteerMap[detailTicket.id] || volunteers[0]?.id || ''}
                          onChange={(e) =>
                            setSelectedVolunteerMap({
                              ...selectedVolunteerMap,
                              [detailTicket.id]: e.target.value,
                            })
                          }
                          className="w-full h-11 pl-3 pr-8 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 appearance-none truncate"
                        >
                          {volunteers.map((vol) => (
                            <option key={vol.id} value={vol.id}>
                              {vol.full_name} ({vol.role})
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                          ▼
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleAssignVolunteer(detailTicket.id);
                          setDetailTicket(null);
                        }}
                        disabled={assigningId === detailTicket.id}
                        className="w-full sm:w-auto h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer shrink-0 active:scale-95"
                      >
                        <UserCheck className="w-4 h-4 shrink-0" />
                        <span>{assigningId === detailTicket.id ? t.assigningBtn : t.assignBtn}</span>
                      </button>
                    </div>
                  </div>
                )}

                {detailTicket.status === 'IN_PROGRESS' && (
                  <button
                    type="button"
                    onClick={() => {
                      setDetailTicket(null);
                      handleOpenResolveModal(detailTicket);
                    }}
                    className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{t.submitProofBtn}</span>
                  </button>
                )}

                {detailTicket.status === 'RESOLVED' && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
                    <span>{t.resolvedBanner}</span>
                    <Link
                      href={`/m/${orgParam}/review`}
                      className="text-blue-700 underline text-xs font-bold"
                    >
                      {t.openApprovalDesk}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TOP HEADER & TITLE ZONE                                               */}
      {/* ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider border border-blue-200">
              {t.complaintsDeskBadge}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              {t.liveFeedsActive}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            {t.pageTitle}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/m/${orgParam}/review`}
            className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition shrink-0 active:scale-95"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{t.openApprovalDesk} ({pendingReviewCount})</span>
          </Link>
          <Link
            href={`/p/${orgParam}`}
            target="_blank"
            className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs flex items-center gap-1.5 transition shrink-0 active:scale-95"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">{t.citizenQrPortal}</span>
            <span className="sm:hidden">Portal</span>
          </Link>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. MOBILE THUMB-FRIENDLY SEGMENTED STATUS SWITCHER (ONE-HAND ACCESS)   */}
      {/* ===================================================================== */}
      <div className="md:hidden grid grid-cols-3 gap-1.5 p-1 bg-slate-200/70 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('NEW')}
          className={`py-2 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95 ${
            activeTab === 'NEW'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="text-[10px] uppercase tracking-wider font-extrabold opacity-85">{t.statusNew}</span>
          <span className="text-base font-black leading-none">{newCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('IN_PROGRESS')}
          className={`py-2 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95 ${
            activeTab === 'IN_PROGRESS'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="text-[10px] uppercase tracking-wider font-extrabold opacity-85">{t.statusInProgress}</span>
          <span className="text-base font-black leading-none">{inProgressCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('RESOLVED')}
          className={`py-2 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95 ${
            activeTab === 'RESOLVED'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="text-[10px] uppercase tracking-wider font-extrabold opacity-85">{t.statusResolved}</span>
          <span className="text-base font-black leading-none">{resolvedCount}</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* 2. DESKTOP 3 INTERACTIVE STATUS CARDS (NEW, IN PROGRESS, RESOLVED)    */}
      {/* ===================================================================== */}
      <div className="hidden md:grid md:grid-cols-3 gap-4">
        {/* CARD 1: NEW / UNASSIGNED */}
        <button
          type="button"
          onClick={() => setActiveTab('NEW')}
          className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
            activeTab === 'NEW'
              ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-start justify-between w-full">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                {t.newCardTitle}
              </span>
              <div className="text-2xl font-black text-blue-700 mt-1">
                {newCount}
              </div>
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              activeTab === 'NEW' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'
            }`}>
              <Inbox className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 w-full">
            <span>{t.statusNew}</span>
            <span className={`font-bold ${activeTab === 'NEW' ? 'text-blue-700' : 'text-slate-400'}`}>
              {activeTab === 'NEW' ? t.selectedView : t.clickToView}
            </span>
          </div>
        </button>

        {/* CARD 2: IN FIELD ACTION */}
        <button
          type="button"
          onClick={() => setActiveTab('IN_PROGRESS')}
          className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
            activeTab === 'IN_PROGRESS'
              ? 'bg-amber-50/80 border-amber-600 ring-2 ring-amber-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-start justify-between w-full">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                {t.inProgressCardTitle}
              </span>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {inProgressCount}
              </div>
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              activeTab === 'IN_PROGRESS' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600'
            }`}>
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 w-full">
            <span>{t.statusInProgress}</span>
            <span className={`font-bold ${activeTab === 'IN_PROGRESS' ? 'text-amber-600' : 'text-slate-400'}`}>
              {activeTab === 'IN_PROGRESS' ? t.selectedView : t.clickToView}
            </span>
          </div>
        </button>

        {/* CARD 3: TOTAL RESOLVED */}
        <button
          type="button"
          onClick={() => setActiveTab('RESOLVED')}
          className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
            activeTab === 'RESOLVED'
              ? 'bg-emerald-50/80 border-emerald-600 ring-2 ring-emerald-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-start justify-between w-full">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                {t.resolvedCardTitle}
              </span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {resolvedCount}
              </div>
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              activeTab === 'RESOLVED' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 w-full">
            <span>{t.statusResolved}</span>
            <span className={`font-bold ${activeTab === 'RESOLVED' ? 'text-emerald-600' : 'text-slate-400'}`}>
              {activeTab === 'RESOLVED' ? t.selectedView : t.clickToView}
            </span>
          </div>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* SEARCH & SIDE-BY-SIDE DROPDOWNS (WARDS & CATEGORY SIDE-BY-SIDE)      */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs space-y-2.5 sm:space-y-3">
        {/* Row 1: Universal Search (Full Width) */}
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full h-10 sm:h-11 pl-10 pr-9 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Row 2: Wards Dropdown & Category Dropdown Side-by-Side (50% / 50%) */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {/* Left: Ward Selector */}
          <div className="relative">
            <select
              value={selectedWardId}
              onChange={(e) => setSelectedWardId(e.target.value)}
              className="w-full h-10 sm:h-11 pl-2.5 sm:pl-3.5 pr-7 rounded-xl bg-slate-50 border border-slate-200 text-[11px] sm:text-xs font-bold text-slate-800 appearance-none cursor-pointer focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 truncate"
            >
              <option value="ALL">{t.allWardsOption}</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  Ward {w.ward_number} - {w.name}
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px] sm:text-xs">
              ▼
            </div>
          </div>

          {/* Right: Category / Issue Filter Dropdown (Default: All) */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-10 sm:h-11 pl-2.5 sm:pl-3.5 pr-7 rounded-xl bg-slate-50 border border-slate-200 text-[11px] sm:text-xs font-bold text-slate-800 appearance-none cursor-pointer focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 truncate"
            >
              <option value="ALL">{t.allIssues}</option>
              <option value="ROADS">{t.roads}</option>
              <option value="WATER">{t.water}</option>
              <option value="DRAINAGE">{t.drainage}</option>
              <option value="LIGHTS">{t.lights}</option>
              <option value="GARBAGE">{t.garbage}</option>
              <option value="OTHER">{t.other}</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px] sm:text-xs">
              ▼
            </div>
          </div>
        </div>

        {/* Counter & Active Filter Reset */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5 pt-0.5">
          <span>
            {t.showingCount} <strong className="text-slate-800 font-bold">{displayedTickets.length}</strong>
          </span>
          {(searchQuery || selectedWardId !== 'ALL' || selectedCategory !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedWardId('ALL');
                setSelectedCategory('ALL');
              }}
              className="text-blue-600 font-bold hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* CLEAN, HAND-FRIENDLY COMPLAINT CARDS                                  */}
      {/* SHOWS: ID, TYPE, STATUS (BLUE/ORANGE/GREEN), IMAGE, [MORE DETAILS →]  */}
      {/* ===================================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${
              activeTab === 'NEW'
                ? 'bg-blue-600'
                : activeTab === 'IN_PROGRESS'
                ? 'bg-amber-500 animate-pulse'
                : 'bg-emerald-600'
            }`} />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              {activeTab === 'NEW' && `${t.newCardTitle} (${newCount})`}
              {activeTab === 'IN_PROGRESS' && `${t.inProgressCardTitle} (${inProgressCount})`}
              {activeTab === 'RESOLVED' && `${t.resolvedCardTitle} (${resolvedCount})`}
            </h2>
          </div>
        </div>

        {displayedTickets.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-dashed border-slate-200 text-center space-y-2">
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
          <div className="space-y-2.5">
            {displayedTickets.map((ticket) => {
              const ticketWard = wards.find((w) => w.id === ticket.ward_id);

              return (
                <div
                  key={ticket.id}
                  onClick={() => setDetailTicket(ticket)}
                  className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 hover:border-blue-400 shadow-2xs hover:shadow-md transition cursor-pointer flex items-center justify-between gap-3 group active:scale-[0.99]"
                >
                  {/* Left: Thumbnail Image + Details */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Attached Photo Thumbnail */}
                    <div
                      className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center"
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
                          alt="Attached Evidence"
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-slate-300" />
                      )}
                    </div>

                    {/* Middle: ID, Type, Status & Basic Citizen Info */}
                    <div className="min-w-0 space-y-1">
                      {/* Pill Row */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        {/* 1. Complaint ID */}
                        <span className="font-mono font-bold text-blue-700 text-[11px] sm:text-xs px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200">
                          {ticket.ticket_number}
                        </span>

                        {/* 2. Type of Complaint */}
                        <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase tracking-wider">
                          {getCategoryLabel(ticket.category)}
                        </span>

                        {/* 3. Status Badge (Strict colors: Blue / Orange / Green) */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                          ticket.status === 'NEW'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : ticket.status === 'IN_PROGRESS'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          {ticket.status === 'NEW' ? t.statusNew : ticket.status === 'IN_PROGRESS' ? t.statusInProgress : t.statusResolved}
                        </span>
                      </div>

                      {/* Citizen & Location Snippet */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 truncate">
                        <span className="font-bold text-slate-900 truncate">
                          {ticket.citizen_name}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500 text-[11px] truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                          Ward {ticketWard?.ward_number || '01'} • {ticket.location_address || 'Mangalagiri'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Desktop "More Details →" / Mobile Chevron */}
                  <div className="shrink-0 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailTicket(ticket);
                      }}
                      className="hidden sm:flex h-10 px-4 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-bold text-xs items-center justify-center gap-1.5 transition cursor-pointer border border-slate-200 hover:border-blue-600"
                    >
                      <span>{t.moreDetailsBtn}</span>
                    </button>
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 sm:hidden">
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
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
