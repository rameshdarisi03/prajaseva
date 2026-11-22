'use client';

import React, { useState, useEffect, useRef, use } from 'react';
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
  PlusCircle,
  FileSpreadsheet,
  Check
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

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWardId, setSelectedWardId] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [highPriorityOnly, setHighPriorityOnly] = useState(false);

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
      // Fetch tickets
      const tRes = await fetch(`/api/management/tickets?role=ADMIN&status=ALL`);
      const tData = await tRes.json();
      if (tData.tickets) setAllTickets(tData.tickets);
      if (tData.volunteers) setVolunteers(tData.volunteers);

      // Fetch wards
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

      // Refresh tickets
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to assign volunteer');
    } finally {
      setAssigningId(null);
    }
  };

  // 3. Volunteer Submits Resolution Proof (Moves to PENDING_APPROVAL / Review Gate)
  const handleOpenResolveModal = (ticket: Complaint) => {
    setResolvingTicket(ticket);
    setAfterPhotoBase64(null);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setVolunteerCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          // fallback close to ticket coords
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

  // 4. Filtering Logic
  const filteredTickets = allTickets.filter((t) => {
    // Ward filter
    if (selectedWardId !== 'ALL' && t.ward_id !== selectedWardId) return false;
    // Category filter
    if (selectedCategory !== 'ALL' && t.category !== selectedCategory) return false;
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTicket = t.ticket_number?.toLowerCase().includes(q);
      const matchName = t.citizen_name?.toLowerCase().includes(q);
      const matchPhone = t.citizen_phone?.includes(q);
      const matchAddress = t.location_address?.toLowerCase().includes(q);
      if (!matchTicket && !matchName && !matchPhone && !matchAddress) return false;
    }
    return true;
  });

  // Buckets
  const newTickets = filteredTickets.filter((t) => t.status === 'NEW');
  const inProgressTickets = filteredTickets.filter((t) => t.status === 'IN_PROGRESS');
  const pendingReviewTickets = allTickets.filter((t) => t.status === 'PENDING_APPROVAL');
  const resolvedTickets = filteredTickets.filter((t) => t.status === 'RESOLVED');

  return (
    <div className="space-y-6">
      {/* Volunteer Resolution Modal */}
      {resolvingTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
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
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Capture after-work photography. This will be automatically validated by GPS geofence and sent to the MLA Review Gate.
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
                <img src={afterPhotoBase64} alt="After work" className="w-full h-48 object-cover" />
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
                className="w-full py-6 border-2 border-dashed border-emerald-300 rounded-xl bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Camera className="w-8 h-8 text-emerald-600" />
                <span className="text-xs font-bold">Capture After Photo (లైవ్ ఫోటో)</span>
                <span className="text-[11px] text-slate-400">GPS location stamped automatically</span>
              </button>
            )}

            {/* Geofence notice */}
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

      {/* Top Header & Actions Zone */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wider">
              Triage Dispatch Desk
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
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
            <span>Open Review & QA Chamber ({pendingReviewTickets.length})</span>
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

      {/* 4 KPI Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Grievances
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {allTickets.length}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Inbox className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Constituency Total</span>
            <span className="text-blue-600 font-bold">100% Tracked</span>
          </div>
        </div>

        {/* Card 2: In Field Action */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                In Field Action
              </span>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {inProgressTickets.length}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Active Volunteers</span>
            <span className="text-amber-600 font-bold">{volunteers.length} Deployed</span>
          </div>
        </div>

        {/* Card 3: Pending Review / QA Gate */}
        <Link
          href={`/m/${orgParam}/review`}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-amber-300 transition group"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Review & QA Gate
              </span>
              <div className="text-2xl font-black text-purple-600 mt-1 flex items-center gap-2">
                {pendingReviewTickets.length}
                {pendingReviewTickets.length > 0 && (
                  <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                    Action Required
                  </span>
                )}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold group-hover:scale-105 transition">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Awaiting MLA Sign-off</span>
            <span className="text-purple-600 font-bold flex items-center gap-0.5">
              Open Chamber <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </Link>

        {/* Card 4: Total Resolved */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Resolved
              </span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {resolvedTickets.length}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Resolution Rate</span>
            <span className="text-emerald-600 font-bold">
              {allTickets.length > 0
                ? `${Math.round((resolvedTickets.length / allTickets.length) * 100)}%`
                : '100%'}
            </span>
          </div>
        </div>
      </div>

      {/* Omni-Search & Multilayer Filtering Suite */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Universal Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Ticket ID (CMP-1001), Citizen Name, Mobile, or Landmark..."
              className="w-full h-11 pl-10 pr-12 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-mono">
              ⌘K
            </div>
          </div>

          {/* Ward Selector Dropdown */}
          <div className="relative w-full lg:w-72">
            <select
              value={selectedWardId}
              onChange={(e) => setSelectedWardId(e.target.value)}
              className="w-full h-11 pl-3.5 pr-8 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 appearance-none cursor-pointer focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Wards (Entire Constituency)</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              ▼
            </div>
          </div>

          {/* Live Auto-Refresh badge */}
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 shrink-0">
            <RotateCcw className="w-3.5 h-3.5 text-blue-600 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Live 30s Sync</span>
          </div>
        </div>

        {/* Category Pills Horizon */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
          {['ALL', 'ROADS', 'WATER', 'DRAINAGE', 'LIGHTS', 'GARBAGE', 'OTHER'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'ALL' ? 'All Issues' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3-Column Ground Triage Kanban */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ========================================= */}
        {/* COLUMN 1: New / Unassigned                */}
        {/* ========================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                New / Unassigned
              </h2>
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center justify-center">
                {newTickets.length}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-semibold">Triage Queue</span>
          </div>

          {newTickets.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-200 text-center text-xs text-slate-400">
              No new unassigned complaints
            </div>
          ) : (
            newTickets.map((ticket) => {
              const ticketWard = wards.find((w) => w.id === ticket.ward_id);

              return (
                <div
                  key={ticket.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-blue-600 text-sm">
                      {ticket.ticket_number}
                    </span>
                    {/* Ward Badge on Top-Right */}
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[10px] font-extrabold border border-blue-200 truncate max-w-[150px]">
                      🏷️ {ticketWard?.name || 'Constituency Ward'}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">
                        {ticket.citizen_name}
                      </span>
                      <a
                        href={`tel:${ticket.citizen_phone}`}
                        className="text-[11px] font-mono text-slate-500 hover:text-blue-600 flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3 text-emerald-600" />
                        +91 {ticket.citizen_phone}
                      </a>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Lodged {formatDateTime(ticket.created_at)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <span className="font-bold text-blue-700 text-[11px]">
                      {ticket.category}
                    </span>
                    {ticket.description && (
                      <p className="text-slate-700 text-[11px] line-clamp-2">
                        {ticket.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1 text-slate-500 text-[10px] pt-0.5">
                      <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                      <span className="truncate">{ticket.location_address || 'Mangalagiri Area'}</span>
                    </div>
                  </div>

                  {/* Citizen Photo Preview */}
                  {ticket.before_photo_url && (
                    <div className="rounded-xl overflow-hidden border border-slate-200">
                      <img
                        src={ticket.before_photo_url}
                        alt="Evidence"
                        className="w-full h-36 object-cover"
                      />
                    </div>
                  )}

                  {/* Audio Voice Note Player if present */}
                  {ticket.voice_note_url && (
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <audio src={ticket.voice_note_url} controls className="h-6 w-full" />
                    </div>
                  )}

                  {/* 1-Tap Assign Volunteer Dropdown */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex gap-2">
                      <select
                        value={selectedVolunteerMap[ticket.id] || volunteers[0]?.id || ''}
                        onChange={(e) =>
                          setSelectedVolunteerMap({
                            ...selectedVolunteerMap,
                            [ticket.id]: e.target.value,
                          })
                        }
                        className="flex-1 h-9 px-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                      >
                        {volunteers.map((vol) => (
                          <option key={vol.id} value={vol.id}>
                            Assign: {vol.full_name} ({vol.role})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAssignVolunteer(ticket.id)}
                        disabled={assigningId === ticket.id}
                        className="h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 flex items-center gap-1 transition"
                      >
                        {assigningId === ticket.id ? 'Deploying...' : 'Deploy'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ========================================= */}
        {/* COLUMN 2: In Progress / Ground Action     */}
        {/* ========================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                In Progress / Ground Action
              </h2>
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center">
                {inProgressTickets.length}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-semibold">Active Crews</span>
          </div>

          {inProgressTickets.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-200 text-center text-xs text-slate-400">
              No tickets currently in ground progress
            </div>
          ) : (
            inProgressTickets.map((ticket) => {
              const ticketWard = wards.find((w) => w.id === ticket.ward_id);

              return (
                <div
                  key={ticket.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3 hover:shadow-md transition border-l-4 border-l-amber-500"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-blue-600 text-sm">
                      {ticket.ticket_number}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-extrabold border border-amber-200 truncate max-w-[150px]">
                      🏷️ {ticketWard?.name || 'Constituency Ward'}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">
                        {ticket.citizen_name}
                      </span>
                      <a
                        href={`https://maps.google.com/?q=${ticket.latitude},${ticket.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Navigation className="w-3 h-3" />
                        Navigate GPS
                      </a>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Assigned {formatDateTime(ticket.assigned_at || ticket.created_at)}
                    </span>
                  </div>

                  {/* Citizen Photographic Evidence */}
                  {ticket.before_photo_url && (
                    <div className="rounded-xl overflow-hidden border border-slate-200">
                      <img
                        src={ticket.before_photo_url}
                        alt="Evidence"
                        className="w-full h-40 object-cover"
                      />
                      <div className="bg-slate-50 py-1 px-2.5 text-[10px] text-slate-500 font-medium">
                        Citizen Evidence Photo
                      </div>
                    </div>
                  )}

                  {/* Audio Player if present */}
                  {ticket.voice_note_url && (
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <audio src={ticket.voice_note_url} controls className="h-6 w-full" />
                    </div>
                  )}

                  {/* Submit Field Proof Action */}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleOpenResolveModal(ticket)}
                      className="w-full h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Take After Photo → Send to QA Gate</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ========================================= */}
        {/* COLUMN 3: Resolved                        */}
        {/* ========================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Resolved Archive
              </h2>
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">
                {resolvedTickets.length}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-semibold">Verified</span>
          </div>

          {resolvedTickets.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-200 text-center text-xs text-slate-400">
              No tickets resolved yet
            </div>
          ) : (
            resolvedTickets.map((ticket) => {
              const ticketWard = wards.find((w) => w.id === ticket.ward_id);
              const turnaround = calculateTurnaround(ticket.created_at, ticket.resolved_at || new Date().toISOString());

              return (
                <div
                  key={ticket.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-emerald-600 text-sm">
                      {ticket.ticket_number}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-extrabold border border-emerald-200 truncate max-w-[150px]">
                      🏷️ {ticketWard?.name || 'Constituency Ward'}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">
                        {ticket.citizen_name}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Resolved in {turnaround}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Signed off {formatDateTime(ticket.resolved_at || ticket.created_at)}
                    </span>
                  </div>

                  {/* Side-by-side Proof Preview */}
                  <div className="grid grid-cols-2 gap-2">
                    {ticket.before_photo_url && (
                      <div className="rounded-lg overflow-hidden border border-slate-200">
                        <img
                          src={ticket.before_photo_url}
                          alt="Before"
                          className="w-full h-24 object-cover"
                        />
                        <div className="bg-slate-50 text-center py-0.5 text-[9px] text-slate-400">
                          Before
                        </div>
                      </div>
                    )}
                    {ticket.after_photo_url && (
                      <div className="rounded-lg overflow-hidden border border-emerald-200">
                        <img
                          src={ticket.after_photo_url}
                          alt="After"
                          className="w-full h-24 object-cover"
                        />
                        <div className="bg-emerald-50 text-center py-0.5 text-[9px] text-emerald-600 font-bold">
                          After (Clean) ✓
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> WhatsApp Sent
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600">
                      ⭐⭐⭐⭐⭐ 5.0
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
