'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Lock,
  Phone,
  CheckCircle2,
  Clock,
  MapPin,
  ExternalLink,
  Camera,
  RotateCcw,
  UserCheck,
  BarChart3,
  LogOut,
  ChevronRight,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { Complaint, UserRole } from '@/types';
import { formatDateTime } from '@/lib/dateUtils';
import { compressImage } from '@/lib/imageCompression';
import Link from 'next/link';

interface SessionUser {
  staffId: string;
  name: string;
  phone: string;
  role: UserRole;
  organizationId: string;
}

export default function ManagementPortal() {
  // Authentication State
  const [session, setSession] = useState<SessionUser | null>(null);
  const [authStep, setAuthStep] = useState<'PHONE' | 'PIN'>('PHONE');
  const [inputPhone, setInputPhone] = useState('9206651295'); // Pre-fill founder for testing
  const [inputPin, setInputPin] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Dashboard State
  const [activeBucket, setActiveBucket] = useState<'NEW' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'RESOLVED'>('NEW');
  const [tickets, setTickets] = useState<Complaint[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Volunteer Proof Submission Modal
  const [resolvingTicket, setResolvingTicket] = useState<Complaint | null>(null);
  const [afterPhotoBase64, setAfterPhotoBase64] = useState<string | null>(null);
  const [volunteerCoords, setVolunteerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Initial load check
  useEffect(() => {
    const saved = localStorage.getItem('praja_seva_session');
    if (saved) {
      try {
        setSession(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // Fetch tickets whenever session or active bucket changes
  useEffect(() => {
    if (session) {
      fetchTickets();
    }
  }, [session, activeBucket]);

  const fetchTickets = async () => {
    if (!session) return;
    try {
      setLoadingTickets(true);
      const res = await fetch(
        `/api/management/tickets?role=${session.role}&staffId=${session.staffId}&status=${activeBucket}`
      );
      const data = await res.json();
      setTickets(data.tickets || []);
      if (data.volunteers) setVolunteers(data.volunteers);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  // Step 1: Check Closed Whitelist
  const handleCheckWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      setAuthLoading(true);
      const res = await fetch('/api/management/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_whitelist', phone: inputPhone }),
      });
      const data = await res.json();
      if (!data.whitelisted) {
        setAuthError(data.message || 'Access Restricted: Unauthorized phone number');
      } else {
        setAuthStep('PIN');
      }
    } catch (err) {
      setAuthError('Network error. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Step 2: Verify 4-Digit PIN
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      setAuthLoading(true);
      const res = await fetch('/api/management/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_pin', phone: inputPhone, pin: inputPin }),
      });
      const data = await res.json();
      if (data.success && data.session) {
        setSession(data.session);
        localStorage.setItem('praja_seva_session', JSON.stringify(data.session));
      } else {
        setAuthError(data.error || 'Incorrect 4-digit PIN');
      }
    } catch (err) {
      setAuthError('Login failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('praja_seva_session');
    setSession(null);
    setAuthStep('PHONE');
    setInputPin('');
  };

  // Assign Ticket (Admin)
  const handleAssignTicket = async (ticketId: string, volunteerId: string) => {
    try {
      const res = await fetch('/api/management/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign', ticketId, volunteerId }),
      });
      if (res.ok) fetchTickets();
    } catch (e) {
      console.error('Assign failed:', e);
    }
  };

  // Approve Resolution (Admin)
  const handleApproveResolution = async (ticketId: string) => {
    if (!confirm('Approve resolution and broadcast Before/After poster to WhatsApp groups?')) return;
    try {
      const res = await fetch('/api/management/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_resolution', ticketId }),
      });
      if (res.ok) fetchTickets();
    } catch (e) {
      console.error('Approval failed:', e);
    }
  };

  // Volunteer Proof Capture
  const handleAfterPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Grab phone GPS at the exact instant
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setVolunteerCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }

    const { base64 } = await compressImage(file, 1280, 1280, 0.75);
    setAfterPhotoBase64(base64);
  };

  // Volunteer Submit Proof
  const handleSubmitProof = async () => {
    if (!resolvingTicket || !afterPhotoBase64) return;
    try {
      setIsSubmittingProof(true);
      const res = await fetch('/api/management/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_resolution',
          ticketId: resolvingTicket.id,
          afterPhotoBase64: afterPhotoBase64,
          volunteerLat: volunteerCoords?.lat,
          volunteerLng: volunteerCoords?.lng,
        }),
      });
      if (res.ok) {
        setResolvingTicket(null);
        setAfterPhotoBase64(null);
        fetchTickets();
      }
    } catch (e) {
      console.error('Submit proof failed:', e);
    } finally {
      setIsSubmittingProof(false);
    }
  };

  // =========================================================================
  // VIEW 1: GATEKEEPER LOGIN VIEW (IF NOT AUTHENTICATED)
  // =========================================================================
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-700 shadow-2xl text-white space-y-6 animate-in fade-in">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/30">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide">
              Staff & Admin Command Portal
            </h1>
            <p className="text-xs text-slate-400">
              Closed-Whitelist System • Mangalagiri Constituency
            </p>
          </div>

          {authError && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-start gap-3 text-rose-200 text-xs">
              <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">{authError}</p>
            </div>
          )}

          {authStep === 'PHONE' ? (
            <form onSubmit={handleCheckWhitelist} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Registered Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-bold text-sm">
                    +91
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={inputPhone}
                    onChange={(e) => setInputPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 10-digit mobile"
                    className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading || inputPhone.length < 10}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50 text-sm"
              >
                {authLoading ? 'Checking Whitelist...' : 'Continue with Phone ➔'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div className="text-center">
                <span className="text-xs text-slate-400 block mb-1">
                  Logging in as: <strong>+91 {inputPhone}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep('PHONE');
                    setInputPin('');
                  }}
                  className="text-xs text-emerald-400 hover:underline"
                >
                  Change Number
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5 text-center">
                  Enter 4-Digit Security PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  autoFocus
                  required
                  value={inputPin}
                  onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full py-3 text-center text-3xl tracking-[0.6em] font-black bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading || inputPin.length !== 4}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50 text-sm"
              >
                {authLoading ? 'Verifying PIN...' : 'Verify PIN & Open Dashboard'}
              </button>
            </form>
          )}

          <div className="text-center pt-2">
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              ← Return to Public Citizen Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: LOGGED-IN STAFF / ADMIN 3-BUCKET DASHBOARD
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 px-4 py-3 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white shadow">
              🏛️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white">Mangalagiri Grievance Ops</h1>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {session.role}
                </span>
              </div>
              <p className="text-xs text-slate-400">Officer: {session.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {session.role === 'ADMIN' && (
              <Link
                href="/management/analytics"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Executive Analytics</span>
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 transition-colors rounded-lg"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3-Bucket Filter Bar */}
        <div className="max-w-6xl mx-auto mt-3 grid grid-cols-4 gap-1.5 bg-slate-800/80 p-1 rounded-xl">
          {[
            { key: 'NEW', label: '🔴 New', count: '' },
            { key: 'IN_PROGRESS', label: '🟡 In Progress', count: '' },
            { key: 'PENDING_APPROVAL', label: '🟠 Review', count: '' },
            { key: 'RESOLVED', label: '🟢 Resolved', count: '' },
          ].map((bucket) => (
            <button
              key={bucket.key}
              onClick={() => setActiveBucket(bucket.key as any)}
              className={`py-2 text-xs font-bold rounded-lg transition-all text-center ${
                activeBucket === bucket.key
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {bucket.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Feed */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 pb-20">
        {loadingTickets ? (
          <div className="p-12 text-center text-slate-500 font-semibold text-sm">
            Loading tickets from Mumbai database...
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-md mx-auto mt-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Tickets in this Queue</h3>
            <p className="text-xs text-slate-500 mt-1">
              {activeBucket === 'NEW'
                ? 'All citizen grievances have been assigned.'
                : 'No grievances match the current filter.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div>
                      <span className="text-base font-black text-slate-900 tracking-wide">
                        #{t.ticket_number}
                      </span>
                      <span className="text-[11px] text-slate-400 block font-medium">
                        {formatDateTime(t.created_at)}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 uppercase">
                      {t.category}
                    </span>
                  </div>

                  {/* Citizen Info & Contact */}
                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        {t.citizen_name}
                      </span>
                      <span className="text-[11px] text-slate-500">{t.citizen_phone}</span>
                    </div>
                    <a
                      href={`tel:${t.citizen_phone}`}
                      className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call
                    </a>
                  </div>

                  {/* Description */}
                  {t.description && (
                    <p className="text-xs text-slate-700 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100 line-clamp-3">
                      "{t.description}"
                    </p>
                  )}

                  {/* Photo Thumbnails */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">
                        BEFORE PROOF
                      </span>
                      <img
                        src={t.before_photo_url}
                        alt="Before"
                        className="w-full h-28 object-cover rounded-xl border border-slate-200"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">
                        AFTER RESOLUTION
                      </span>
                      {t.after_photo_url ? (
                        <img
                          src={t.after_photo_url}
                          alt="After"
                          className="w-full h-28 object-cover rounded-xl border border-emerald-300"
                        />
                      ) : (
                        <div className="w-full h-28 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-[11px] text-slate-400 font-medium text-center p-2">
                          Pending Field Work
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Proximity / Fraud Check Badge */}
                  {t.status === 'PENDING_APPROVAL' && (
                    <div
                      className={`p-2.5 rounded-xl text-xs flex items-center gap-2 font-semibold ${
                        t.is_proximity_verified
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {t.is_proximity_verified ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      )}
                      <span>
                        {t.is_proximity_verified
                          ? `Verified on-site: Shot ${t.proximity_meters || 12}m from spot`
                          : `Location Warning: Uploaded ${t.proximity_meters || 500}m away`}
                      </span>
                    </div>
                  )}

                  {/* 1-Tap Google Maps Turn-by-Turn Navigation */}
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${t.latitude},${t.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-200"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-600" />
                    <span>Get Directions (Google Maps)</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>

                {/* Bottom Action Triggers */}
                <div className="pt-3 border-t border-slate-100">
                  {/* ADMIN ACTION: Assign to Volunteer */}
                  {session.role === 'ADMIN' && t.status === 'NEW' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Assign to Volunteer:
                      </label>
                      <select
                        onChange={(e) => handleAssignTicket(t.id, e.target.value)}
                        defaultValue=""
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="" disabled>
                          Select Volunteer...
                        </option>
                        {volunteers.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.full_name} ({v.phone})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* VOLUNTEER ACTION: Upload After Photo */}
                  {session.role === 'VOLUNTEER' && t.status === 'IN_PROGRESS' && (
                    <button
                      type="button"
                      onClick={() => setResolvingTicket(t)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Take After Photo & Resolve</span>
                    </button>
                  )}

                  {/* ADMIN ACTION: Approve & Broadcast Poster */}
                  {session.role === 'ADMIN' && t.status === 'PENDING_APPROVAL' && (
                    <button
                      type="button"
                      onClick={() => handleApproveResolution(t.id)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Approve & Broadcast Poster</span>
                    </button>
                  )}

                  {t.status === 'RESOLVED' && (
                    <div className="text-center text-xs font-bold text-emerald-700 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Resolved & Broadcasted</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Volunteer Resolution Modal */}
      {resolvingTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Submit Field Proof for #{resolvingTicket.ticket_number}
            </h3>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={cameraInputRef}
              onChange={handleAfterPhoto}
              className="hidden"
            />

            {afterPhotoBase64 ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200">
                <img src={afterPhotoBase64} alt="After" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="absolute bottom-2 right-2 px-3 py-1 bg-black/70 text-white text-xs font-bold rounded-lg"
                >
                  Retake
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full h-36 border-2 border-dashed border-emerald-300 rounded-xl bg-emerald-50 flex flex-col items-center justify-center gap-2 text-emerald-800 text-xs font-bold"
              >
                <Camera className="w-8 h-8 text-emerald-600" />
                <span>Open Live Camera & Shoot After Photo</span>
              </button>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setResolvingTicket(null);
                  setAfterPhotoBase64(null);
                }}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!afterPhotoBase64 || isSubmittingProof}
                onClick={handleSubmitProof}
                className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs disabled:opacity-50"
              >
                {isSubmittingProof ? 'Uploading to Zoho...' : 'Submit for QA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
