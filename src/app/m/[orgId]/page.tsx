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
  Send,
  Navigation,
  Download,
  Check,
  X,
  Maximize2,
  User,
  Building2,
  Eye,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { Complaint, ComplaintCategory } from '@/types';
import { formatDateTime, calculateTurnaround } from '@/lib/dateUtils';
import { compressImage } from '@/lib/imageCompression';

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

  // Tickets & Wards Data
  const [allTickets, setAllTickets] = useState<Complaint[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: driven by top 3 cards (NEW, IN_PROGRESS, RESOLVED)
  const [activeTab, setActiveTab] = useState<'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'ALL'>('NEW');

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWardId, setSelectedWardId] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Selected Ticket for Full Details Drawer / Modal
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

  // 2. Assign Ticket to Volunteer
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
      if (activeTab !== 'ALL' && t.status !== activeTab) {
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

  return (
    <div className="space-y-6 pb-12">
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
              ✕ Close
            </button>
          </div>
        </div>
      )}

      {/* Volunteer Resolution Modal */}
      {resolvingTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono font-bold text-blue-600 text-xs">
                  {resolvingTicket.ticket_number}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Submit Field Resolution Proof
                </h3>
              </div>
              <button
                onClick={() => setResolvingTicket(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Capture resolution photo evidence. Hardware coordinates will be automatically verified against the citizen's lodged pin.
            </p>

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
              <div className="relative rounded-xl overflow-hidden border border-emerald-200">
                <img src={afterPhotoBase64} alt="After work" className="w-full h-52 object-cover" />
                <button
                  onClick={() => setAfterPhotoBase64(null)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  ✕
                </button>
                <div className="absolute bottom-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  Resolved Proof Ready ✓
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-emerald-300 rounded-xl bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Camera className="w-8 h-8 text-emerald-600" />
                <span className="text-xs font-bold">Capture After Photo (లైవ్ ఫోటో)</span>
                <span className="text-[11px] text-slate-400">GPS location stamped automatically</span>
              </button>
            )}

            {volunteerCoords && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                <span className="text-slate-500">Volunteer GPS:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {volunteerCoords.lat.toFixed(5)}, {volunteerCoords.lng.toFixed(5)}
                </span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResolvingTicket(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitProof}
                disabled={isSubmittingProof || !afterPhotoBase64}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSubmittingProof ? 'Sending...' : 'Send to MLA Review Gate →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FULL TICKET DETAILS MODAL / DRAWER (OPENS ON LIST CLICK)               */}
      {/* ===================================================================== */}
      {detailTicket && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 lg:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-blue-700 text-sm px-2.5 py-1 rounded-lg bg-blue-100 border border-blue-200">
                  {detailTicket.ticket_number}
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {detailTicket.category} Grievance Dossier
                  </h3>
                  <span className="text-xs text-slate-500">
                    Lodged: {formatDateTime(detailTicket.created_at)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  detailTicket.status === 'NEW'
                    ? 'bg-blue-100 text-blue-800'
                    : detailTicket.status === 'IN_PROGRESS'
                    ? 'bg-amber-100 text-amber-800'
                    : detailTicket.status === 'PENDING_APPROVAL'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {detailTicket.status}
                </span>
                <button
                  onClick={() => setDetailTicket(null)}
                  className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Citizen Details */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Complainant Name
                  </span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {detailTicket.citizen_name}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    WhatsApp Mobile
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
                    Ward Jurisdiction
                  </span>
                  <div className="font-semibold text-slate-800 text-xs mt-0.5">
                    🏷️ {wards.find(w => w.id === detailTicket.ward_id)?.name || 'Constituency Ward'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    GPS Coordinates
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

              {/* Location Address */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  Landmark / Street Address
                </span>
                <p className="text-slate-800 font-medium">
                  {detailTicket.location_address || 'Mangalagiri Assembly Constituency'}
                </p>
              </div>

              {/* Description */}
              {detailTicket.description && (
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    Complaint Remarks
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
                    <span className="text-xs font-bold text-purple-950">Citizen Voice Note Recording</span>
                  </div>
                  <audio src={detailTicket.voice_note_url} controls className="h-8 max-w-[240px]" />
                </div>
              )}

              {/* Photos Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Before Photo */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Citizen Lodged Evidence
                  </span>
                  {detailTicket.before_photo_url ? (
                    <div
                      className="relative rounded-xl overflow-hidden border border-slate-200 h-52 bg-slate-100 cursor-pointer group"
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
                    <div className="h-52 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                      No photo attached
                    </div>
                  )}
                </div>

                {/* After Photo (if available) */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">
                    Resolution Proof (After)
                  </span>
                  {detailTicket.after_photo_url ? (
                    <div
                      className="relative rounded-xl overflow-hidden border-2 border-emerald-500 h-52 bg-emerald-50 cursor-pointer group"
                      onClick={() => setLightboxImage(detailTicket.after_photo_url || null)}
                    >
                      <img
                        src={detailTicket.after_photo_url}
                        alt="Resolution Proof"
                        className="w-full h-full object-cover group-hover:scale-102 transition"
                      />
                      <span className="absolute bottom-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        AFTER (RESOLVED) ✓
                      </span>
                      <span className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  ) : (
                    <div className="h-52 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
                      <Clock className="w-8 h-8 mb-1.5 text-slate-300" />
                      <span>Pending Field Resolution Photo</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Bar inside Drawer */}
              <div className="pt-4 border-t border-slate-200">
                {detailTicket.status === 'NEW' && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-600 block">
                      Deploy Field Volunteer
                    </span>
                    <div className="flex gap-2">
                      <select
                        value={selectedVolunteerMap[detailTicket.id] || volunteers[0]?.id || ''}
                        onChange={(e) =>
                          setSelectedVolunteerMap({
                            ...selectedVolunteerMap,
                            [detailTicket.id]: e.target.value,
                          })
                        }
                        className="flex-1 h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                      >
                        {volunteers.map((vol) => (
                          <option key={vol.id} value={vol.id}>
                            Assign: {vol.full_name} ({vol.role})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          handleAssignVolunteer(detailTicket.id);
                          setDetailTicket(null);
                        }}
                        disabled={assigningId === detailTicket.id}
                        className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>{assigningId === detailTicket.id ? 'Deploying...' : 'Deploy Crew'}</span>
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
                    className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Take Resolution Photo & Send to QA Gate</span>
                  </button>
                )}

                {detailTicket.status === 'RESOLVED' && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
                    <span>✓ This complaint was verified and approved by the MLA office.</span>
                    <Link
                      href={`/m/${orgParam}/review`}
                      className="text-blue-700 underline text-xs font-bold"
                    >
                      View in QA Chamber
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider border border-blue-200">
              TRIAGE DISPATCH DESK
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Live Feeds Active
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Grievance Operations & Ground Triage
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time telemetry and rapid volunteer dispatch across all constituency wards
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/m/${orgParam}/review`}
            className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Open Review & QA Chamber ({pendingReviewCount})</span>
          </Link>
          <Link
            href={`/p/${orgParam}`}
            target="_blank"
            className="h-10 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs flex items-center gap-1.5 transition"
          >
            <ExternalLink className="w-4 h-4 text-blue-600" />
            <span>Citizen QR Portal</span>
          </Link>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TOP CARDS: 3 INTERACTIVE STATUS SELECTORS (NEW, IN PROGRESS, RESOLVED) */}
      {/* (REVIEW & QA GATE CARD REMOVED AS REQUESTED)                           */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                New / Unassigned
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
            <span>Triage Queue</span>
            <span className={`font-bold ${activeTab === 'NEW' ? 'text-blue-700' : 'text-slate-400'}`}>
              {activeTab === 'NEW' ? '● Active View' : 'Click to view'}
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
                In Field Action
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
            <span>Active Volunteers Deployed</span>
            <span className={`font-bold ${activeTab === 'IN_PROGRESS' ? 'text-amber-600' : 'text-slate-400'}`}>
              {activeTab === 'IN_PROGRESS' ? '● Active View' : 'Click to view'}
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
                Total Resolved
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
            <span>Verified & Dispatched</span>
            <span className={`font-bold ${activeTab === 'RESOLVED' ? 'text-emerald-600' : 'text-slate-400'}`}>
              {activeTab === 'RESOLVED' ? '● Active View' : 'Click to view'}
            </span>
          </div>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* SEARCH & FILTERS BAR                                                  */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Universal Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Ticket ID (CMP-1005), Citizen, Mobile, or Landmark..."
              className="w-full h-11 pl-10 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* Ward Dropdown */}
          <div className="relative w-full lg:w-72">
            <select
              value={selectedWardId}
              onChange={(e) => setSelectedWardId(e.target.value)}
              className="w-full h-11 pl-3.5 pr-8 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 appearance-none cursor-pointer focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Wards (Entire Constituency)</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  Ward {w.ward_number} - {w.name}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">
              ▼
            </div>
          </div>

          {/* View All Pill */}
          <button
            onClick={() => setActiveTab(activeTab === 'ALL' ? 'NEW' : 'ALL')}
            className={`h-11 px-3.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{activeTab === 'ALL' ? 'Showing All' : 'Show All Tickets'}</span>
          </button>
        </div>

        {/* Category Filter Horizon */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Category:
          </span>
          {['ALL', 'ROADS', 'WATER', 'DRAINAGE', 'LIGHTS', 'GARBAGE', 'OTHER'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'ALL' ? 'All Issues' : cat}
            </button>
          ))}
          <div className="ml-auto text-[11px] text-slate-400 shrink-0 pl-2">
            Showing <strong className="text-slate-800">{displayedTickets.length}</strong> complaints
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SLEEK, LIST-BASED CARDS SECTION (ONLY ACTIVE TAB LISTED)              */}
      {/* ===================================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${
              activeTab === 'NEW'
                ? 'bg-blue-600'
                : activeTab === 'IN_PROGRESS'
                ? 'bg-amber-500 animate-pulse'
                : activeTab === 'RESOLVED'
                ? 'bg-emerald-600'
                : 'bg-slate-800'
            }`} />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              {activeTab === 'NEW' && `New Unassigned Complaints (${newCount})`}
              {activeTab === 'IN_PROGRESS' && `In-Field Action Complaints (${inProgressCount})`}
              {activeTab === 'RESOLVED' && `Resolved Archive (${resolvedCount})`}
              {activeTab === 'ALL' && `All Constituency Complaints (${allTickets.length})`}
            </h2>
          </div>
          <span className="text-xs text-slate-400">Click any card to inspect full details</span>
        </div>

        {displayedTickets.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 border border-dashed border-slate-200 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              No Complaints in this view
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {activeTab === 'NEW' && 'All new complaints have been assigned to field volunteers.'}
              {activeTab === 'IN_PROGRESS' && 'No field work is currently in progress.'}
              {activeTab === 'RESOLVED' && 'No resolved tickets match the current filter.'}
              {activeTab === 'ALL' && 'No complaints found matching your search.'}
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
                  className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-blue-400 shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  {/* Left Column: ID, Category & Citizen Info */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Category Icon Badge */}
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition">
                      {ticket.category === 'ROADS' && <Zap className="w-5 h-5" />}
                      {ticket.category === 'WATER' && <Droplet className="w-5 h-5" />}
                      {ticket.category === 'DRAINAGE' && <Droplet className="w-5 h-5" />}
                      {ticket.category === 'LIGHTS' && <Lightbulb className="w-5 h-5" />}
                      {ticket.category === 'GARBAGE' && <Trash className="w-5 h-5" />}
                      {!['ROADS', 'WATER', 'DRAINAGE', 'LIGHTS', 'GARBAGE'].includes(ticket.category) && (
                        <AlertTriangle className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      {/* Top Pill Row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-blue-700 text-xs px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200">
                          {ticket.ticket_number}
                        </span>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ticket.status === 'NEW'
                            ? 'bg-blue-100 text-blue-800'
                            : ticket.status === 'IN_PROGRESS'
                            ? 'bg-amber-100 text-amber-800'
                            : ticket.status === 'PENDING_APPROVAL'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {ticket.status}
                        </span>

                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase">
                          {ticket.category}
                        </span>

                        <span className="text-[10px] text-slate-500 font-medium">
                          🏷️ Ward {ticketWard?.ward_number || '01'} ({ticketWard?.name || 'Central'})
                        </span>
                      </div>

                      {/* Citizen Name & Landmark */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                        <span className="font-bold text-slate-900">
                          {ticket.citizen_name}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500 font-mono text-[11px] flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          +91 {ticket.citizen_phone}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500 truncate max-w-xs text-[11px] flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                          {ticket.location_address || 'Mangalagiri Area'}
                        </span>
                      </div>

                      {/* Evidence Tags */}
                      <div className="flex items-center gap-3 pt-0.5 text-[11px] text-slate-400">
                        {ticket.before_photo_url && (
                          <span className="flex items-center gap-1 text-blue-600 font-medium">
                            <Camera className="w-3 h-3" /> Photo Attached
                          </span>
                        )}
                        {ticket.voice_note_url && (
                          <span className="flex items-center gap-1 text-purple-600 font-medium">
                            <Volume2 className="w-3 h-3" /> Audio Note
                          </span>
                        )}
                        <span className="text-slate-400">
                          Lodged {formatDateTime(ticket.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Fast Actions */}
                  <div
                    className="flex items-center gap-2 self-end md:self-center shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {ticket.status === 'NEW' && (
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedVolunteerMap[ticket.id] || volunteers[0]?.id || ''}
                          onChange={(e) =>
                            setSelectedVolunteerMap({
                              ...selectedVolunteerMap,
                              [ticket.id]: e.target.value,
                            })
                          }
                          className="h-9 px-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 max-w-[160px]"
                        >
                          {volunteers.map((vol) => (
                            <option key={vol.id} value={vol.id}>
                              {vol.full_name} ({vol.role})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleAssignVolunteer(ticket.id)}
                          disabled={assigningId === ticket.id}
                          className="h-9 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 transition shadow-xs cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{assigningId === ticket.id ? '...' : 'Deploy'}</span>
                        </button>
                      </div>
                    )}

                    {ticket.status === 'IN_PROGRESS' && (
                      <button
                        type="button"
                        onClick={() => handleOpenResolveModal(ticket)}
                        className="h-9 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Submit Proof</span>
                      </button>
                    )}

                    {ticket.status === 'RESOLVED' && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Resolved
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setDetailTicket(ticket)}
                      className="h-9 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 transition"
                    >
                      <span>Details</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
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
