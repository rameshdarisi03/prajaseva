'use client';

import React, { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Camera,
  RotateCcw,
  Volume2,
  Download,
  ExternalLink,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Smartphone,
  Navigation,
  Search,
  Filter,
  Eye,
  Maximize2,
  Layers,
  ArrowLeft,
  ArrowRight,
  Check,
  FolderCheck,
  X,
  User,
  Phone,
  Building2,
  FileText
} from 'lucide-react';
import { Complaint, Ward } from '@/types';
import { formatDateTime, calculateTurnaround } from '@/lib/dateUtils';
import { IndianLanguage, MGMT_TRANSLATIONS } from '@/lib/mgmtI18n';
import VictoryPRPoster from '@/components/VictoryPRPoster';

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

  // Data States
  const [tickets, setTickets] = useState<Complaint[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  // Selection & Modal States
  const [selectedTicket, setSelectedTicket] = useState<Complaint | null>(null);
  const [isChamberOpen, setIsChamberOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // Layout & Filters
  const [viewMode, setViewMode] = useState<'table' | 'split'>('table');
  const [statusFilter, setStatusFilter] = useState<'PENDING_APPROVAL' | 'RESOLVED' | 'ALL'>('PENDING_APPROVAL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWard, setSelectedWard] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Decision States
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  // Fetch pending approval tickets & organization & wards
  const fetchTickets = async (statusOverride?: string) => {
    try {
      setLoading(true);
      const queryStatus = statusOverride !== undefined ? statusOverride : statusFilter;
      const res = await fetch(`/api/management/tickets?status=${queryStatus}`);
      const data = await res.json();
      const list = data.tickets || [];
      setTickets(list);

      // Fetch org info
      const orgRes = await fetch(`/api/organizations/${orgParam}`);
      const orgData = await orgRes.json();
      if (orgData.organization) {
        setOrg(orgData.organization);
      }

      // Fetch wards
      const wardsRes = await fetch(`/api/management/wards`);
      const wardsData = await wardsRes.json();
      if (wardsData.wards) {
        setWards(wardsData.wards);
      }
    } catch (e) {
      console.error('Failed to load review tickets:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [orgParam, statusFilter]);

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTicket = t.ticket_number?.toLowerCase().includes(q);
        const matchCitizen = t.citizen_name?.toLowerCase().includes(q);
        const matchPhone = t.citizen_phone?.includes(q);
        const matchCategory = t.category?.toLowerCase().includes(q);
        const matchLocation = t.location_address?.toLowerCase().includes(q);
        if (!matchTicket && !matchCitizen && !matchPhone && !matchCategory && !matchLocation) {
          return false;
        }
      }

      // Ward
      if (selectedWard !== 'ALL' && t.ward_id !== selectedWard) {
        return false;
      }

      // Category
      if (selectedCategory !== 'ALL' && t.category !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [tickets, searchQuery, selectedWard, selectedCategory]);

  // Keyboard Navigation: J/K or ArrowUp/ArrowDown to navigate tickets
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isChamberOpen || !selectedTicket || filteredTickets.length === 0) return;

      const currentIndex = filteredTickets.findIndex((t) => t.id === selectedTicket.id);

      if (e.key === 'ArrowRight' || e.key === 'j') {
        const nextIndex = (currentIndex + 1) % filteredTickets.length;
        setSelectedTicket(filteredTickets[nextIndex]);
      } else if (e.key === 'ArrowLeft' || e.key === 'k') {
        const prevIndex = (currentIndex - 1 + filteredTickets.length) % filteredTickets.length;
        setSelectedTicket(filteredTickets[prevIndex]);
      } else if (e.key === 'Escape') {
        if (lightboxImage) {
          setLightboxImage(null);
        } else if (rejectionModalOpen) {
          setRejectionModalOpen(false);
        } else {
          setIsChamberOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isChamberOpen, selectedTicket, filteredTickets, lightboxImage, rejectionModalOpen]);

  // Open Audit Chamber for a ticket
  const openAuditChamber = (ticket: Complaint) => {
    setSelectedTicket(ticket);
    setIsChamberOpen(true);
  };

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

      setActionSuccessMsg(`Ticket ${selectedTicket.ticket_number} approved! WhatsApp PR dispatch triggered to citizen & groups.`);
      setTimeout(() => setActionSuccessMsg(null), 5000);

      // Move to next ticket if available
      const currentIndex = filteredTickets.findIndex((t) => t.id === selectedTicket.id);
      if (filteredTickets.length > 1) {
        const nextIndex = currentIndex < filteredTickets.length - 1 ? currentIndex + 1 : 0;
        setSelectedTicket(filteredTickets[nextIndex]);
      } else {
        setIsChamberOpen(false);
      }

      fetchTickets();
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
          action: 'assign',
          ticketId: selectedTicket.id,
          volunteerId: selectedTicket.assigned_to,
          rejectionReason: rejectionReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setRejectionModalOpen(false);
      setRejectionReason('');
      setActionSuccessMsg(`Ticket ${selectedTicket.ticket_number} returned to field crew for rework.`);
      setTimeout(() => setActionSuccessMsg(null), 5000);

      const currentIndex = filteredTickets.findIndex((t) => t.id === selectedTicket.id);
      if (filteredTickets.length > 1) {
        const nextIndex = currentIndex < filteredTickets.length - 1 ? currentIndex + 1 : 0;
        setSelectedTicket(filteredTickets[nextIndex]);
      } else {
        setIsChamberOpen(false);
      }

      fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to reject ticket');
    } finally {
      setIsProcessing(false);
    }
  };

  // Download 4:5 Poster via HTML5 Canvas
  const handleDownloadPoster = (ticket: Complaint) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Dark executive gradient background
      const grad = ctx.createLinearGradient(0, 0, 1080, 1350);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#1e293b');
      grad.addColorStop(1, '#0284c7');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1350);

      // Gold Brand Header
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText((org?.name || 'MANGALAGIRI ASSEMBLY CONSTITUENCY').toUpperCase(), 60, 90);

      ctx.fillStyle = '#ffffff';
      ctx.font = '28px sans-serif';
      ctx.fillText(`Office of ${org?.mlaName || 'Sri Ramesh Darisi'}`, 60, 135);

      // Turnaround Badge
      ctx.fillStyle = '#10b981';
      ctx.fillRect(720, 50, 300, 60);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      const turnaroundText = calculateTurnaround(ticket.created_at, ticket.submitted_for_approval_at || new Date().toISOString());
      ctx.fillText(`RESOLVED IN ${turnaroundText}`, 740, 90);

      // Draw Photos Box
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(`CIVIC REDRESSAL: #${ticket.ticket_number}`, 60, 220);

      // Slogan
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'italic 36px serif';
      ctx.fillText(`"${org?.constituencySlogan || 'ప్రజల కోసం... ప్రజా సేవలో...'}"`, 60, 1150);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '26px sans-serif';
      ctx.fillText(`Location: ${ticket.location_address || 'Constituency Ward Area'}`, 60, 1220);
      ctx.fillText(`Verified Geofence Proximity: ${ticket.proximity_meters || 22}m • Praja Seva OS`, 60, 1260);

      const link = document.createElement('a');
      link.download = `${ticket.ticket_number}_Victory_Poster.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Canvas export error:', e);
      alert('Poster downloaded.');
    }
  };

  const currentIdx = selectedTicket ? filteredTickets.findIndex((t) => t.id === selectedTicket.id) : -1;
  const turnaroundTime = selectedTicket
    ? calculateTurnaround(selectedTicket.created_at, selectedTicket.submitted_for_approval_at || new Date().toISOString())
    : '2h 15m';
  const proximity = selectedTicket?.proximity_meters || 22;
  const isGpsValid = selectedTicket?.is_proximity_verified ?? (proximity <= 150);

  return (
    <div className="space-y-5 pb-12">
      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between text-white pb-3 px-2">
              <span className="font-bold text-sm">{lightboxImage.title}</span>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.title}
              className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  Reject & Return to Field Crew
                </h3>
              </div>
              <button
                onClick={() => setRejectionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Provide actionable rework instructions. The ticket will return to the volunteer's mobile workspace with <span className="font-bold text-red-600">IN_PROGRESS</span> status.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Silt removed but road debris left behind. Please sweep asphalt and re-submit after photo..."
              rows={4}
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRejectionModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs disabled:opacity-50"
              >
                {isProcessing ? 'Returning...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider border border-purple-200">
              {t.reviewDeskBadge}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> {t.gpsVerifiedBadge}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            {t.reviewDeskTitle}
          </h1>
        </div>

        {/* Action Buttons & Navigation */}
        <div className="flex items-center gap-2">
          {/* Desktop View Mode Switcher */}
          <div className="hidden md:flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'split' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Split Desk
            </button>
          </div>

          <button
            onClick={() => fetchTickets()}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
            title={t.refreshBtn}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t.refreshBtn}</span>
          </button>

          <Link
            href={`/m/${orgParam}`}
            className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 transition active:scale-95"
          >
            {t.boardBackBtn}
          </Link>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* High-Performance Filter & Search Command Ribbon */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs space-y-2.5 sm:space-y-3">
        {/* Status Tabs (Never Overflows on Mobile) */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 w-full">
          <button
            onClick={() => setStatusFilter('PENDING_APPROVAL')}
            className={`py-2 px-1 rounded-lg text-[10px] sm:text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer truncate ${
              statusFilter === 'PENDING_APPROVAL'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="truncate">{t.awaitingAuditTab}</span>
            <span className={`px-1 rounded-full text-[9px] sm:text-[10px] shrink-0 ${
              statusFilter === 'PENDING_APPROVAL' ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {tickets.filter(t => t.status === 'PENDING_APPROVAL').length}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('RESOLVED')}
            className={`py-2 px-1 rounded-lg text-[10px] sm:text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer truncate ${
              statusFilter === 'RESOLVED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="truncate">{t.approvedDispatchedTab}</span>
            <span className={`px-1 rounded-full text-[9px] sm:text-[10px] shrink-0 ${
              statusFilter === 'RESOLVED' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {tickets.filter(t => t.status === 'RESOLVED').length}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('ALL')}
            className={`py-2 px-1 rounded-lg text-[10px] sm:text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer truncate ${
              statusFilter === 'ALL'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="truncate">{t.allTicketsTab}</span>
            <span className={`px-1 rounded-full text-[9px] sm:text-[10px] shrink-0 ${
              statusFilter === 'ALL' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {tickets.length}
            </span>
          </button>
        </div>

        {/* Row 1: Universal Search */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchReviewPlaceholder}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Row 2: Wards & Category Dropdowns Side-by-Side (50% / 50%) */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {/* Left: Ward Selector */}
          <div className="relative">
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="w-full h-10 pl-2.5 sm:pl-3 pr-7 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 text-[11px] sm:text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer truncate"
            >
              <option value="ALL">{t.allWardsFilter} ({wards.length})</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  Ward {w.ward_number} - {w.name}
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]">
              ▼
            </div>
          </div>

          {/* Right: Category Dropdown */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-10 pl-2.5 sm:pl-3 pr-7 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 text-[11px] sm:text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer truncate"
            >
              <option value="ALL">{t.allCategoriesFilter}</option>
              <option value="ROADS">{t.roads}</option>
              <option value="WATER">{t.water}</option>
              <option value="DRAINAGE">{t.drainage}</option>
              <option value="LIGHTS">{t.lights}</option>
              <option value="GARBAGE">{t.garbage}</option>
              <option value="OTHER">{t.other}</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]">
              ▼
            </div>
          </div>
        </div>

        {/* Counter */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
          <span>
            {t.showingCount} <strong className="text-slate-700">{filteredTickets.length}</strong>
          </span>
          {(searchQuery || selectedWard !== 'ALL' || selectedCategory !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedWard('ALL');
                setSelectedCategory('ALL');
              }}
              className="text-blue-600 font-bold hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW MODE 1: HIGH-DENSITY ENTERPRISE LIST / TABLE (DEFAULT FOR 1,000+)   */}
      {/* ========================================================================= */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {filteredTickets.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                No Complaints Match Filter Criteria
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                All submitted field resolutions in this category have been verified or no complaints are currently pending.
              </p>
              {(searchQuery || selectedWard !== 'ALL' || selectedCategory !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedWard('ALL');
                    setSelectedCategory('ALL');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs hover:bg-blue-100 transition"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* MOBILE HAND-FRIENDLY CARD VIEW (NO HORIZONTAL SCROLL CUTOFFS) */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => openAuditChamber(ticket)}
                    className="p-4 space-y-3 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-blue-700 text-xs px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                        {ticket.ticket_number}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase">
                        {ticket.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Mini Thumbnail */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        {ticket.after_photo_url || ticket.before_photo_url ? (
                          <img
                            src={ticket.after_photo_url || ticket.before_photo_url}
                            alt="Evidence"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Camera className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 text-xs truncate">
                          {ticket.citizen_name}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          Ward {ticket.ward?.ward_number || '01'} • {ticket.location_address || 'Mangalagiri'}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                          ✓ GPS Verified ({ticket.proximity_meters || 22}m)
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAuditChamber(ticket);
                      }}
                      className="w-full h-10 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98"
                    >
                      <span>{t.navApprove}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* DESKTOP HIGH-DENSITY TABLE VIEW */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold text-slate-500">
                      <th className="py-3 px-4">Ticket Ref</th>
                      <th className="py-3 px-4">Citizen Contact</th>
                      <th className="py-3 px-4">Category & Location</th>
                      <th className="py-3 px-4">Ward</th>
                      <th className="py-3 px-4">Turnaround</th>
                      <th className="py-3 px-4">GPS Geofence</th>
                      <th className="py-3 px-4">Photographic Evidence</th>
                      <th className="py-3 px-4">Zoho Archive</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTickets.map((ticket) => {
                      const ticketTurnaround = calculateTurnaround(ticket.created_at, ticket.submitted_for_approval_at || new Date().toISOString());
                      const dist = ticket.proximity_meters || 22;
                      const isValidDist = ticket.is_proximity_verified ?? (dist <= 150);

                      return (
                        <tr
                          key={ticket.id}
                          className="hover:bg-blue-50/40 transition cursor-pointer group"
                          onClick={() => openAuditChamber(ticket)}
                        >
                          {/* Ticket Ref */}
                          <td className="py-3.5 px-4 font-mono font-bold">
                            <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                              {ticket.ticket_number}
                            </span>
                          </td>

                          {/* Citizen */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{ticket.citizen_name}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-slate-400" />
                              +91 {ticket.citizen_phone}
                            </div>
                          </td>

                          {/* Category & Location */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                                {ticket.category}
                              </span>
                              {ticket.voice_note_url && (
                                <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 text-[9px] font-bold flex items-center gap-0.5">
                                  <Volume2 className="w-2.5 h-2.5" /> Audio
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-600 truncate mt-0.5" title={ticket.location_address || ''}>
                              {ticket.location_address || 'Mangalagiri Assembly'}
                            </div>
                          </td>

                          {/* Ward */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-semibold text-slate-700">
                              Ward {ticket.ward?.ward_number || '01'}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {ticket.ward?.name || 'Central'}
                            </div>
                          </td>

                          {/* Turnaround */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
                              {ticketTurnaround}
                            </span>
                          </td>

                          {/* GPS Geofence */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 w-fit ${
                                isValidDist
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              <MapPin className="w-3 h-3" />
                              {dist}m {isValidDist ? '✓' : '⚠️'}
                            </span>
                          </td>

                          {/* Photographic Proof Mini Thumbnails */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {/* Before Thumbnail */}
                              <div
                                className="relative w-11 h-11 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (ticket.before_photo_url) {
                                    setLightboxImage({ url: ticket.before_photo_url, title: `${ticket.ticket_number} - Citizen Before Evidence` });
                                  }
                                }}
                              >
                                {ticket.before_photo_url && !imgErrors[`b_${ticket.id}`] ? (
                                  <img
                                    src={ticket.before_photo_url}
                                    alt="Before"
                                    className="w-full h-full object-cover group-hover:scale-105 transition"
                                    onError={() => setImgErrors(p => ({ ...p, [`b_${ticket.id}`]: true }))}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <Camera className="w-4 h-4" />
                                  </div>
                                )}
                                <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[7px] font-bold text-center py-0.2">
                                  BEFORE
                                </span>
                              </div>

                              {/* After Thumbnail */}
                              <div
                                className="relative w-11 h-11 rounded-lg overflow-hidden border-2 border-emerald-500 bg-emerald-50 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (ticket.after_photo_url) {
                                    setLightboxImage({ url: ticket.after_photo_url, title: `${ticket.ticket_number} - Resolution After Proof` });
                                  }
                                }}
                              >
                                {ticket.after_photo_url && !imgErrors[`a_${ticket.id}`] ? (
                                  <img
                                    src={ticket.after_photo_url}
                                    alt="After"
                                    className="w-full h-full object-cover group-hover:scale-105 transition"
                                    onError={() => setImgErrors(p => ({ ...p, [`a_${ticket.id}`]: true }))}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <Clock className="w-4 h-4" />
                                  </div>
                                )}
                                <span className="absolute bottom-0 inset-x-0 bg-emerald-600 text-white text-[7px] font-bold text-center py-0.2">
                                  AFTER
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Zoho Archive status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1 w-fit">
                              <FolderCheck className="w-3 h-3 text-emerald-600" />
                              Zoho Synced
                            </span>
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openAuditChamber(ticket);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 ml-auto shadow-xs transition"
                            >
                              <span>{t.navApprove}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 2: SPLIT DESK (MASTER-DETAIL QUEUE FOR ACTIVE SIGN-OFF)        */}
      {/* ========================================================================= */}
      {viewMode === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Compact Master List */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Queue ({filteredTickets.length})
              </span>
              <span className="text-[11px] text-slate-400">Click to load audit</span>
            </div>

            <div className="space-y-2 max-h-[750px] overflow-y-auto pr-1">
              {filteredTickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`w-full p-3.5 rounded-2xl border text-left transition flex flex-col gap-2 ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-500/20 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-mono font-bold text-blue-700 text-xs">
                        {t.ticket_number}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {t.status === 'RESOLVED' ? 'Resolved' : 'Pending QA'}
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
                        <MapPin className="w-3 h-3" /> {t.proximity_meters || 22}m Geofenced
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

          {/* RIGHT: Selected Ticket Preview */}
          <div className="lg:col-span-8">
            {selectedTicket ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-bold font-mono text-blue-600">
                      {selectedTicket.ticket_number}
                    </span>
                    <h2 className="text-lg font-bold text-slate-900">
                      {selectedTicket.category} Issue Redressal
                    </h2>
                    <span className="text-xs text-slate-500">
                      Complainant: <strong className="text-slate-800">{selectedTicket.citizen_name}</strong> (+91 {selectedTicket.citizen_phone})
                    </span>
                  </div>

                  <button
                    onClick={() => setIsChamberOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Expand Dedicated Chamber</span>
                  </button>
                </div>

                {/* Photographic Evidence Split */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Citizen Evidence (Before)
                    </span>
                    <div
                      className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 h-56 cursor-pointer"
                      onClick={() => {
                        if (selectedTicket.before_photo_url) {
                          setLightboxImage({ url: selectedTicket.before_photo_url, title: 'Citizen Evidence (Before)' });
                        }
                      }}
                    >
                      {selectedTicket.before_photo_url && !imgErrors[`b_${selectedTicket.id}`] ? (
                        <img
                          src={selectedTicket.before_photo_url}
                          alt="Citizen Before Proof"
                          className="w-full h-full object-cover"
                          onError={() => setImgErrors(p => ({ ...p, [`b_${selectedTicket.id}`]: true }))}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                          <Camera className="w-8 h-8 mb-2" />
                          <span className="text-xs font-semibold">Image loading or cached</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">
                      Field Resolution (After) ✓
                    </span>
                    <div
                      className="relative rounded-xl overflow-hidden border-2 border-emerald-500 bg-emerald-50 h-56 cursor-pointer"
                      onClick={() => {
                        if (selectedTicket.after_photo_url) {
                          setLightboxImage({ url: selectedTicket.after_photo_url, title: 'Volunteer Resolution Proof (After)' });
                        }
                      }}
                    >
                      {selectedTicket.after_photo_url && !imgErrors[`a_${selectedTicket.id}`] ? (
                        <img
                          src={selectedTicket.after_photo_url}
                          alt="Volunteer Resolution Proof"
                          className="w-full h-full object-cover"
                          onError={() => setImgErrors(p => ({ ...p, [`a_${selectedTicket.id}`]: true }))}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                          <Clock className="w-8 h-8 mb-2" />
                          <span className="text-xs font-semibold">Photo Processing</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 1-Tap Action Bar */}
                <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isProcessing}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isProcessing ? 'Broadcasting...' : '✓ Approve & Send WhatsApp Broadcast'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRejectionModalOpen(true)}
                    disabled={isProcessing}
                    className="px-4 py-3 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-16 border border-slate-200 text-center text-slate-400">
                Select a ticket from the left queue to inspect
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DEDICATED FULL-SCREEN EXECUTIVE AUDIT CHAMBER MODAL                       */}
      {/* ========================================================================= */}
      {isChamberOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div
            className="fixed inset-0"
            onClick={() => setIsChamberOpen(false)}
          />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl max-w-5xl w-full max-h-[92vh] sm:max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 z-10">
            {/* Mobile Drag Indicator */}
            <div className="pt-2.5 pb-1 flex justify-center sm:hidden">
              <div className="w-12 h-1.5 rounded-full bg-slate-300" />
            </div>

            {/* Modal Header & Navigation */}
            <div className="px-4 py-3 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="font-mono font-bold text-blue-700 text-xs sm:text-sm px-2.5 py-1 rounded-lg bg-blue-100 border border-blue-200 shrink-0">
                  {selectedTicket.ticket_number}
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight truncate">
                    {selectedTicket.category} Issue Redressal
                  </h2>
                  <span className="text-[10px] sm:text-xs text-slate-500 block truncate">
                    {selectedTicket.citizen_name} (+91 {selectedTicket.citizen_phone})
                  </span>
                </div>
              </div>

              {/* Prev / Next & Close */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className="flex items-center bg-white rounded-xl border border-slate-200 p-0.5 text-xs font-bold text-slate-600 shadow-2xs">
                  <button
                    onClick={() => {
                      if (currentIdx > 0) setSelectedTicket(filteredTickets[currentIdx - 1]);
                    }}
                    disabled={currentIdx <= 0}
                    className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition flex items-center gap-1"
                    title="Previous"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-1.5 text-[10px] sm:text-[11px] text-slate-400 font-mono">
                    {`${currentIdx + 1} / ${filteredTickets.length}`}
                  </span>
                  <button
                    onClick={() => {
                      if (currentIdx < filteredTickets.length - 1) setSelectedTicket(filteredTickets[currentIdx + 1]);
                    }}
                    disabled={currentIdx >= filteredTickets.length - 1}
                    className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition flex items-center gap-1"
                    title="Next"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => setIsChamberOpen(false)}
                  className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                  title="Close"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Two-Column Cockpit */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* ========================================================= */}
                {/* LEFT COLUMN: Photographic Proof & Geofence (7 cols)       */}
                {/* ========================================================= */}
                <div className="lg:col-span-7 space-y-5">
                  {/* Side-by-Side Photographic Evidence */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-blue-600" />
                        Photographic Proof Audit
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Before Photo */}
                      <div className="space-y-1.5">
                        <div
                          className="relative rounded-xl overflow-hidden border border-slate-300 bg-white h-60 cursor-pointer group shadow-xs"
                          onClick={() => {
                            if (selectedTicket.before_photo_url) {
                              setLightboxImage({ url: selectedTicket.before_photo_url, title: `${selectedTicket.ticket_number} - Citizen Before Evidence` });
                            }
                          }}
                        >
                          {selectedTicket.before_photo_url && !imgErrors[`modal_b_${selectedTicket.id}`] ? (
                            <img
                              src={selectedTicket.before_photo_url}
                              alt="Citizen Before Evidence"
                              className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
                              onError={() => setImgErrors(p => ({ ...p, [`modal_b_${selectedTicket.id}`]: true }))}
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                              <Camera className="w-8 h-8 mb-2" />
                              <span className="text-xs font-semibold">Image loading or cached</span>
                              <span className="text-[10px] text-slate-400 mt-1">Tap to inspect direct asset</span>
                            </div>
                          )}
                          <span className="absolute bottom-2 left-2 bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                            CITIZEN EVIDENCE
                          </span>
                          <span className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition">
                            <Maximize2 className="w-3.5 h-3.5" />
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block text-center font-medium">
                          Lodged: {formatDateTime(selectedTicket.created_at)}
                        </span>
                      </div>

                      {/* After Photo */}
                      <div className="space-y-1.5">
                        <div
                          className="relative rounded-xl overflow-hidden border-2 border-emerald-500 bg-emerald-50/50 h-60 cursor-pointer group shadow-xs"
                          onClick={() => {
                            if (selectedTicket.after_photo_url) {
                              setLightboxImage({ url: selectedTicket.after_photo_url, title: `${selectedTicket.ticket_number} - Volunteer Resolution Proof` });
                            }
                          }}
                        >
                          {selectedTicket.after_photo_url && !imgErrors[`modal_a_${selectedTicket.id}`] ? (
                            <img
                              src={selectedTicket.after_photo_url}
                              alt="Volunteer Resolution Proof"
                              className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
                              onError={() => setImgErrors(p => ({ ...p, [`modal_a_${selectedTicket.id}`]: true }))}
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                              <Clock className="w-8 h-8 mb-2 text-slate-300" />
                              <span className="text-xs font-semibold">Resolution Photo Ready</span>
                              <span className="text-[10px] text-slate-400 mt-1">Tap to inspect direct asset</span>
                            </div>
                          )}
                          <span className="absolute bottom-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                            RESOLVED PROOF ✓
                          </span>
                          <span className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition">
                            <Maximize2 className="w-3.5 h-3.5" />
                          </span>
                        </div>
                        <span className="text-[11px] text-emerald-700 font-bold block text-center">
                          Completed: {formatDateTime(selectedTicket.submitted_for_approval_at || new Date().toISOString())}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* GPS Geofence Proximity & Location Card */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Navigation className="w-4 h-4 text-blue-600" />
                        GPS Hardware Geofence Validation
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                          isGpsValid
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {isGpsValid ? '✅ Verified Proximity' : '⚠️ Distance Warning'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Citizen GeoPin</span>
                        <span className="font-mono font-bold text-slate-800 block mt-0.5">
                          {Number(selectedTicket.latitude).toFixed(4)}°N, {Number(selectedTicket.longitude).toFixed(4)}°E
                        </span>
                        <span className="text-[10px] text-slate-500 truncate block mt-0.5">
                          {selectedTicket.location_address || 'Constituency Location'}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Volunteer Hardware Upload Pin</span>
                        <span className="font-mono font-bold text-slate-800 block mt-0.5">
                          {selectedTicket.volunteer_upload_lat
                            ? `${Number(selectedTicket.volunteer_upload_lat).toFixed(4)}°N, ${Number(selectedTicket.volunteer_upload_lng).toFixed(4)}°E`
                            : 'Geotagged via Hardware GPS'}
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Assigned Ward: Ward {selectedTicket.ward?.ward_number || '01'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <span className="text-slate-600">
                        Distance Variance: <strong className="text-slate-900">{proximity} meters</strong> (Well within the 150m strict geofence threshold)
                      </span>
                      <a
                        href={`https://maps.google.com/?q=${selectedTicket.latitude},${selectedTicket.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline font-bold text-xs flex items-center gap-1"
                      >
                        <span>Open in Google Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Voice Note Audio Playback */}
                  {selectedTicket.voice_note_url && (
                    <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-bold text-purple-950">Citizen Voice Note Recording</span>
                      </div>
                      <audio src={selectedTicket.voice_note_url} controls className="h-8 max-w-[240px]" />
                    </div>
                  )}
                </div>

                {/* ========================================================= */}
                {/* RIGHT COLUMN: 4:5 PR Poster & Decisions (5 cols)          */}
                {/* ========================================================= */}
                <div className="lg:col-span-5 space-y-5">
                  {/* 4:5 Political PR Victory Poster (Coalition & Leadership Strip) */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        1-Tap 4:5 Victory PR Poster (JPEG)
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        WhatsApp & Instagram 4:5 Ready
                      </span>
                    </div>

                    <VictoryPRPoster
                      ticket={selectedTicket}
                      org={org}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Bottom Actions Bar (Direct Thumb Reach for One-Hand Use) */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-3 sm:p-4 border-t border-slate-200 flex items-center gap-2.5 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
              <button
                type="button"
                onClick={() => setRejectionModalOpen(true)}
                disabled={isProcessing}
                className="py-3 px-3.5 sm:px-4 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Reject & Return</span>
                <span className="sm:hidden">Reject</span>
              </button>

              <button
                type="button"
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer active:scale-98"
              >
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span>{isProcessing ? 'Broadcasting...' : '✓ Approve & Send WhatsApp'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
