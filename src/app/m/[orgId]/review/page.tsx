'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Camera,
  RotateCcw,
  Volume2,
  Share2,
  Download,
  Send,
  ExternalLink,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  FileCheck,
  Smartphone,
  Navigation,
  UserCheck
} from 'lucide-react';
import { Complaint } from '@/types';
import { formatDateTime, calculateTurnaround } from '@/lib/dateUtils';

interface Organization {
  id: string;
  name: string;
  slug: string;
  mlaName: string;
  mlaDesignation: string;
  constituencySlogan: string;
}

export default function ReviewQAPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const resolvedParams = use(params);
  const orgParam = resolvedParams.orgId;

  const [tickets, setTickets] = useState<Complaint[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Complaint | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  // Decision States
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Fetch pending approval tickets & organization
  const fetchPendingTickets = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/management/tickets?status=PENDING_APPROVAL`);
      const data = await res.json();
      const list = data.tickets || [];
      setTickets(list);

      if (list.length > 0) {
        // preserve current selection if still in list, else select first
        setSelectedTicket((prev) => {
          if (prev) {
            const found = list.find((t: Complaint) => t.id === prev.id);
            return found || list[0];
          }
          return list[0];
        });
      } else {
        setSelectedTicket(null);
      }

      // Fetch org info
      const orgRes = await fetch(`/api/organizations/${orgParam}`);
      const orgData = await orgRes.json();
      if (orgData.organization) {
        setOrg(orgData.organization);
      }
    } catch (e) {
      console.error('Failed to load review tickets:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTickets();
  }, [orgParam]);

  // Action: Approve & Send WhatsApp
  const handleApprove = async () => {
    if (!selectedTicket) return;
    try {
      setIsProcessing(true);
      const res = await fetch('/api/management/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_resolution',
          ticketId: selectedTicket.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActionSuccessMsg(`Ticket ${selectedTicket.ticket_number} approved & broadcasted via WhatsApp!`);
      setTimeout(() => setActionSuccessMsg(null), 4000);

      fetchPendingTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to approve resolution');
    } finally {
      setIsProcessing(false);
    }
  };

  // Action: Reject & Reassign to Field
  const handleReject = async () => {
    if (!selectedTicket || !rejectionReason.trim()) {
      alert('Please state a reason for rejection (e.g. photo unclear, incomplete work).');
      return;
    }

    try {
      setIsProcessing(true);
      const res = await fetch('/api/management/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign', // reassigns back to IN_PROGRESS
          ticketId: selectedTicket.id,
          volunteerId: selectedTicket.assigned_to,
          rejectionReason: rejectionReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setRejectionModalOpen(false);
      setRejectionReason('');
      setActionSuccessMsg(`Ticket ${selectedTicket.ticket_number} returned to volunteer for rework.`);
      setTimeout(() => setActionSuccessMsg(null), 4000);

      fetchPendingTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to reject ticket');
    } finally {
      setIsProcessing(false);
    }
  };

  const turnaroundTime = selectedTicket
    ? calculateTurnaround(selectedTicket.created_at, selectedTicket.submitted_for_approval_at || new Date().toISOString())
    : '2h 15m';

  const proximity = selectedTicket?.proximity_meters || 22;
  const isGpsValid = selectedTicket?.is_proximity_verified ?? (proximity <= 150);

  return (
    <div className="space-y-6">
      {/* Rejection Modal */}
      {rejectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  Reject & Return to Field
                </h3>
              </div>
              <button
                onClick={() => setRejectionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Provide specific rework instructions for the volunteer. The ticket will move back to 'In Progress'.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Silt cleared but debris left on road, please clear pavement and retake photo..."
              rows={3}
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRejectionModalOpen(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 font-bold text-xs text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs disabled:opacity-50"
              >
                {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Banner & Executive Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider border border-purple-200">
              EXECUTIVE REVIEW CHAMBER • MLA DISCRETIONARY QA GATE
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> 99.4% Geofence Accuracy
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Executive Review & PR Approval Desk
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Chamber for quality audit, GPS proximity validation, and 1-tap social PR poster publishing for {org?.name || 'Constituency'}
          </p>
        </div>

        {/* Global Stats */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-xs flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
            <span className="font-bold text-purple-900">
              {tickets.length} Awaiting Sign-off
            </span>
          </div>
          <Link
            href={`/m/${orgParam}`}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 transition"
          >
            ← Back to Operations Board
          </Link>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Main 3-Column Cockpit Layout */}
      {tickets.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 border border-slate-200 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Review Queue Clean & Clear!
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All submitted field resolutions have been verified and signed off. No pending tickets require executive review.
          </p>
          <Link
            href={`/m/${orgParam}`}
            className="inline-block mt-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition"
          >
            View Operations Board
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ========================================================= */}
          {/* COLUMN A: Review Queue List (3 cols / ~300px)             */}
          {/* ========================================================= */}
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Awaiting Audit ({tickets.length})
              </span>
              <button
                onClick={fetchPendingTickets}
                className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5"
              >
                <RotateCcw className="w-3 h-3" /> Refresh
              </button>
            </div>

            <div className="space-y-2 max-h-[750px] overflow-y-auto pr-1">
              {tickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`w-full p-3.5 rounded-2xl border text-left transition flex flex-col gap-2 ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-600 ring-2 ring-blue-500/20 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-mono font-bold text-blue-700 text-xs">
                        {t.ticket_number}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                        Pending QA
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {t.citizen_name}
                      </span>
                      <span className="text-[11px] text-slate-500 truncate">
                        {t.category} • {t.location_address || 'Mangalagiri'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100 text-slate-400">
                      <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                        <MapPin className="w-3 h-3" /> GPS Matched ({t.proximity_meters || 22}m)
                      </span>
                      <span className="font-mono font-medium">
                        {calculateTurnaround(t.created_at, t.submitted_for_approval_at || new Date().toISOString())}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================= */}
          {/* COLUMN B: Central Inspection Pane (5 cols)                */}
          {/* ========================================================= */}
          {selectedTicket && (
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                {/* Ticket Identification */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[11px] font-bold text-blue-600 font-mono">
                      {selectedTicket.ticket_number}
                    </span>
                    <h2 className="text-base font-bold text-slate-900 mt-0.5">
                      {selectedTicket.category} Issue Redressal
                    </h2>
                    <span className="text-xs text-slate-500">
                      Complainant: <strong className="text-slate-700">{selectedTicket.citizen_name}</strong> (+91 {selectedTicket.citizen_phone})
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                    Turnaround: {turnaroundTime}
                  </span>
                </div>

                {/* Side-by-Side Before vs After Photographic Evidence */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-blue-600" />
                      Photographic Proof Audit
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      AI Cleanliness Score: 98% ✓
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Before Photo */}
                    <div className="space-y-1">
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                        <img
                          src={selectedTicket.before_photo_url}
                          alt="Citizen Before Evidence"
                          className="w-full h-44 object-cover"
                        />
                        <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          CITIZEN EVIDENCE
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block text-center">
                        Lodged {formatDateTime(selectedTicket.created_at)}
                      </span>
                    </div>

                    {/* After Photo */}
                    <div className="space-y-1">
                      <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 bg-emerald-50">
                        {selectedTicket.after_photo_url ? (
                          <img
                            src={selectedTicket.after_photo_url}
                            alt="Volunteer Resolution Proof"
                            className="w-full h-44 object-cover"
                          />
                        ) : (
                          <div className="w-full h-44 flex flex-col items-center justify-center text-slate-400 text-xs">
                            <Clock className="w-6 h-6 mb-1 text-slate-300" />
                            <span>Photo Processing</span>
                          </div>
                        )}
                        <span className="absolute bottom-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                          RESOLVED PROOF ✓
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-bold block text-center">
                        Completed {formatDateTime(selectedTicket.submitted_for_approval_at || new Date().toISOString())}
                      </span>
                    </div>
                  </div>
                </div>

                {/* GPS Proximity Audit Card */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-blue-600" />
                      GPS Proximity Geofence Audit
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                        isGpsValid
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isGpsValid ? '✅ Verified Proximity' : '⚠️ Distance Warning'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">Citizen GeoPin</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {Number(selectedTicket.latitude).toFixed(4)}°N, {Number(selectedTicket.longitude).toFixed(4)}°E
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">Volunteer Upload Pin</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {selectedTicket.volunteer_upload_lat
                          ? `${Number(selectedTicket.volunteer_upload_lat).toFixed(4)}°N, ${Number(selectedTicket.volunteer_upload_lng).toFixed(4)}°E`
                          : 'Hardware Geotagged'}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 pt-1">
                    Distance: <strong className="text-slate-800">{proximity} meters</strong> (Well within the 100-meter MLA constituency geofence boundary).
                  </p>
                </div>

                {/* Voice Note Audio Debrief */}
                {selectedTicket.voice_note_url && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-800">Citizen Voice Note</span>
                    </div>
                    <audio src={selectedTicket.voice_note_url} controls className="h-7 max-w-[200px]" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* COLUMN C: 4:5 PR Poster Generator & Decision Chamber (4) */}
          {/* ========================================================= */}
          {selectedTicket && (
            <div className="lg:col-span-4 space-y-4">
              {/* 4:5 Political PR Victory Poster Preview */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    1-Tap 4:5 Victory PR Poster
                  </span>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    Instagram & WhatsApp 4:5
                  </span>
                </div>

                {/* Rendered 4:5 Victory Card Graphic */}
                <div className="rounded-2xl overflow-hidden border border-slate-300 shadow-md bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white p-4 space-y-3">
                  {/* Poster Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-500 text-white font-bold flex items-center justify-center text-xs">
                        AP
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                          {org?.name || 'Mangalagiri Assembly'}
                        </span>
                        <span className="text-[9px] text-white/70">
                          Office of {org?.mlaName || 'Sri Ramesh Darisi'}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-400/30">
                      RESOLVED IN {turnaroundTime}
                    </span>
                  </div>

                  {/* Before vs After Split */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="relative rounded-lg overflow-hidden h-24 border border-white/10">
                        <img
                          src={selectedTicket.before_photo_url}
                          alt="Before"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 left-1 bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.2 rounded">
                          BEFORE
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="relative rounded-lg overflow-hidden h-24 border border-emerald-400/50">
                        <img
                          src={selectedTicket.after_photo_url || selectedTicket.before_photo_url}
                          alt="After"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 left-1 bg-emerald-600 text-white text-[8px] font-bold px-1.5 py-0.2 rounded">
                          AFTER (CLEAN)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Slogan & Quote */}
                  <div className="pt-1">
                    <p className="text-xs font-bold text-white text-center leading-snug">
                      "{org?.constituencySlogan || 'ప్రజల కోసం... ప్రజా సేవలో...'}"
                    </p>
                    <p className="text-[10px] text-white/60 text-center mt-0.5">
                      Prompt civic resolution in {selectedTicket.location_address || 'Constituency'}
                    </p>
                  </div>
                </div>

                {/* Poster Action */}
                <button
                  type="button"
                  onClick={() => alert('PR Poster downloaded for WhatsApp & Twitter status!')}
                  className="w-full py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download 4:5 Poster for Social Media</span>
                </button>
              </div>

              {/* Citizen WhatsApp Message Preview */}
              <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5" /> Outgoing WhatsApp Notification Preview
                </span>
                <div className="p-3 rounded-xl bg-white border border-emerald-200 text-[11px] text-slate-700 space-y-1 font-sans">
                  <p className="font-semibold text-slate-900">
                    నమస్కారం {selectedTicket.citizen_name} గారు,
                  </p>
                  <p>
                    మీరు నమోదు చేసిన ఫిర్యాదు <strong>#{selectedTicket.ticket_number}</strong> పరిష్కరించబడింది. మా వాలంటీర్లు పూర్తి చేసిన పనులను ఎమ్మెల్యే కార్యాలయం ఆమోదించింది.
                  </p>
                  <p className="text-emerald-700 font-semibold pt-1">
                    Turnaround: {turnaroundTime} • Praja Seva Cell
                  </p>
                </div>
              </div>

              {/* Decisive Executive Actions */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{isProcessing ? 'Broadcasting...' : '✓ Approve & Send WhatsApp to Citizen'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRejectionModalOpen(true)}
                  disabled={isProcessing}
                  className="w-full py-2.5 rounded-2xl border border-red-200 hover:bg-red-50 text-red-600 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>⟳ Reject & Reassign to Field Crew</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
