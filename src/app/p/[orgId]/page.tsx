'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import {
  Camera,
  MapPin,
  Mic,
  MicOff,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Search,
  RotateCcw,
  Volume2,
  Phone,
  ShieldCheck,
  Send,
  Building2,
  ChevronDown,
  Navigation,
  Globe2,
  Check,
  Zap,
  Droplet,
  Lightbulb,
  Trash,
  LucideIcon
} from 'lucide-react';
import { IndianLanguage } from '@/lib/mgmtI18n';
import { SUPPORTED_LANGUAGES } from '@/lib/landingI18n';
import { CITIZEN_TRANSLATIONS } from '@/lib/citizenI18n';
import { ComplaintCategory, Complaint } from '@/types';
import { compressImage } from '@/lib/imageCompression';
import { formatDateTime } from '@/lib/dateUtils';
import LocationPickerModal from '@/components/LocationPickerModal';
import Link from 'next/link';

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
  mlaPhotoUrl: string | null;
  partyName: string | null;
  partyLogoUrl: string | null;
  partyPrimaryColor: string;
  partySecondaryColor: string;
  constituencySlogan: string;
}

export default function ScopedCitizenPortal({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const resolvedParams = use(params);
  const orgParam = resolvedParams.orgId;

  // Language State - Supporting all 9 Indian Languages
  const [lang, setLang] = useState<IndianLanguage>('te');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'raise' | 'track'>('raise');

  useEffect(() => {
    const saved = localStorage.getItem('praja_seva_lang') as IndianLanguage;
    if (saved && CITIZEN_TRANSLATIONS[saved]) {
      setLang(saved);
    }
    const handleLangChange = (e: any) => {
      if (e.detail && CITIZEN_TRANSLATIONS[e.detail as IndianLanguage]) {
        setLang(e.detail as IndianLanguage);
      }
    };
    window.addEventListener('praja_lang_change', handleLangChange);
    return () => window.removeEventListener('praja_lang_change', handleLangChange);
  }, []);

  const handleSelectLang = (newLang: IndianLanguage) => {
    setLang(newLang);
    setIsLangMenuOpen(false);
    localStorage.setItem('praja_seva_lang', newLang);
    window.dispatchEvent(new CustomEvent('praja_lang_change', { detail: newLang }));
  };

  const ct = CITIZEN_TRANSLATIONS[lang] || CITIZEN_TRANSLATIONS.te;

  // Organization & Wards State
  const [org, setOrg] = useState<Organization | null>(null);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWardId, setSelectedWardId] = useState<string>('');
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);

  // Form State
  const [citizenName, setCitizenName] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('ROADS');
  const [description, setDescription] = useState('');

  // Location State
  const [gpsLoading, setGpsLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Media
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio Recording
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Submission & Confirmation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);

  // Tracking Tab State
  const [trackQuery, setTrackQuery] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackedComplaints, setTrackedComplaints] = useState<Complaint[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // 1. Fetch Organization & Wards
  useEffect(() => {
    async function loadOrgData() {
      try {
        setLoadingOrg(true);
        const res = await fetch(`/api/organizations/${orgParam}`);
        const data = await res.json();
        if (data.success) {
          setOrg(data.organization);
          setWards(data.wards || []);
          if (data.wards && data.wards.length > 0) {
            setSelectedWardId(data.wards[0].id);
          }
        } else {
          setOrgError(data.error || 'Constituency portal not found');
        }
      } catch (e: any) {
        setOrgError(e.message || 'Failed to connect to constituency portal');
      } finally {
        setLoadingOrg(false);
      }
    }
    loadOrgData();
  }, [orgParam]);

  // 2. Auto-detect GPS on component mount & handle incoming ?track= URL param
  useEffect(() => {
    requestGpsLocation();

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const trackParam = urlParams.get('track') || urlParams.get('t') || urlParams.get('query');
      if (trackParam) {
        setTrackQuery(trackParam);
        setActiveTab('track');
        (async () => {
          try {
            setTrackLoading(true);
            setHasSearched(true);
            const res = await fetch(`/api/complaints/track?query=${encodeURIComponent(trackParam.trim())}&q=${encodeURIComponent(trackParam.trim())}`);
            const data = await res.json();
            setTrackedComplaints(data.complaints || []);
          } catch {
            setTrackedComplaints([]);
          } finally {
            setTrackLoading(false);
          }
        })();
      }
    }
  }, []);

  const resolveExactAddress = async (lat: number, lng: number): Promise<string> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: { 'Accept-Language': 'en' },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data?.address) {
          const a = data.address;
          const street = a.building || a.amenity || a.shop || a.road || a.pedestrian;
          const area = a.neighbourhood || a.suburb || a.residential;
          const city = a.city || a.town || a.village || a.county;
          const parts = [street, area, city].filter(Boolean);
          if (parts.length > 0) {
            return parts.join(', ');
          }
        }
        if (data?.display_name) {
          return data.display_name.split(',').slice(0, 3).join(', ');
        }
      }
    } catch {}
    return `GeoPin (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  };

  const requestGpsLocation = () => {
    setGpsLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoords({ lat, lng });
          const addr = await resolveExactAddress(lat, lng);
          setLocationName(addr);
          setGpsLoading(false);
        },
        async () => {
          try {
            const ipRes = await fetch('https://api.bigdatacloud.net/data/client-info');
            if (ipRes.ok) {
              const ipData = await ipRes.json();
              if (ipData?.latitude && ipData?.longitude) {
                const lat = ipData.latitude;
                const lng = ipData.longitude;
                setCoords({ lat, lng });
                const addr = await resolveExactAddress(lat, lng);
                setLocationName(addr);
                setGpsLoading(false);
                return;
              }
            }
          } catch {}
          const defaultLat = 16.4419;
          const defaultLng = 80.5649;
          setCoords({ lat: defaultLat, lng: defaultLng });
          setLocationName('Mangalagiri Central Area, AP');
          setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
      );
    } else {
      setCoords({ lat: 16.4419, lng: 80.5649 });
      setLocationName('Mangalagiri Central Area, AP');
      setGpsLoading(false);
    }
  };

  const handleLocationConfirmed = (lat: number, lng: number, address: string) => {
    setCoords({ lat, lng });
    setLocationName(address);
    setShowLocationModal(false);
  };

  // 3. Photo capture & compression
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const res = await compressImage(file, 1280, 1280, 0.8);
      setPhotoPreview(res.base64);
    } catch (err) {
      alert('Failed to process image. Please try again.');
    } finally {
      setIsCompressing(false);
    }
  };

  // 4. Voice Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setAudioUrl(reader.result as string);
        };
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      alert('Microphone access denied. Please enable microphone permissions in your browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const clearRecording = () => {
    setAudioUrl(null);
    audioChunksRef.current = [];
  };

  // 5. Submit Complaint
  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!citizenName.trim()) {
      alert('Please enter your full name');
      return;
    }
    const cleanPhone = citizenPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      alert('Please enter a valid 10-digit WhatsApp phone number');
      return;
    }
    if (!photoPreview) {
      alert('Please take or attach a photo of the grievance');
      return;
    }
    if (!coords) {
      alert('Location pin is required. Please enable GPS.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: org?.id,
          organizationSlug: org?.slug || orgParam,
          wardId: selectedWardId || wards[0]?.id,
          citizenName: citizenName.trim(),
          citizenPhone: cleanPhone,
          category,
          description: description.trim() || undefined,
          photoBase64: photoPreview,
          voiceNoteUrl: audioUrl || undefined,
          latitude: coords.lat,
          longitude: coords.lng,
          locationAddress: locationName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit grievance');

      setSubmittedTicket(data.complaint.ticket_number);
    } catch (err: any) {
      alert(err.message || 'Error lodging grievance. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Track Complaint
  const handleTrackComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackQuery.trim()) return;

    try {
      setTrackLoading(true);
      setHasSearched(true);
      const res = await fetch(`/api/complaints/track?query=${encodeURIComponent(trackQuery.trim())}&q=${encodeURIComponent(trackQuery.trim())}`);
      const data = await res.json();
      setTrackedComplaints(data.complaints || []);
    } catch {
      setTrackedComplaints([]);
    } finally {
      setTrackLoading(false);
    }
  };

  // Categories configuration with pure dynamic labels
  const categories: { key: ComplaintCategory; label: string; icon: LucideIcon; color: string; bg: string }[] = [
    { key: 'ROADS', label: ct.catRoads, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
    { key: 'WATER', label: ct.catWater, icon: Droplet, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    { key: 'DRAINAGE', label: ct.catDrainage, icon: Droplet, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
    { key: 'LIGHTS', label: ct.catLights, icon: Lightbulb, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
    { key: 'GARBAGE', label: ct.catGarbage, icon: Trash, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
    { key: 'OTHER', label: ct.catOther, icon: Zap, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  ];

  if (loadingOrg) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-900 font-sans">Connecting to Constituency Portal...</h2>
        <p className="text-sm text-slate-500 mt-1">Verifying official constituency credentials</p>
      </div>
    );
  }

  if (orgError || !org) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Portal Not Found</h1>
        <p className="text-slate-600 mt-2 text-sm">
          {orgError || 'The requested constituency organization is not enrolled or the link is invalid.'}
        </p>
        <Link
          href="/"
          className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Return to Platform Home
        </Link>
      </div>
    );
  }

  const selectedWardObj = wards.find((w) => w.id === selectedWardId);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-800 antialiased pb-20">
      {/* Location Picker Modal */}
      {showLocationModal && coords && (
        <LocationPickerModal
          isOpen={showLocationModal}
          currentLat={coords.lat}
          currentLng={coords.lng}
          currentAddress={locationName}
          onConfirm={handleLocationConfirmed}
          onClose={() => setShowLocationModal(false)}
          lang={lang === 'te' || lang === 'en' || lang === 'hi' ? lang : 'te'}
        />
      )}

      {/* Top Super-Clean Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/95 border-b border-slate-200 shadow-2xs backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Left: Constituency Brand */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="font-black text-slate-900 text-sm sm:text-base leading-tight truncate">
              {org.name}
            </span>
          </div>

          {/* Right: Uncropped Indian Languages Selector Dropdown */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition shadow-2xs cursor-pointer whitespace-nowrap active:scale-95"
            >
              <Globe2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{SUPPORTED_LANGUAGES.find((l) => l.code === lang)?.nativeName || 'తెలుగు'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {isLangMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  Select Language / భాష ఎంచుకోండి
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => handleSelectLang(l.code)}
                      className={`w-full px-3 py-1.5 text-left text-xs font-medium flex items-center justify-between hover:bg-slate-50 transition cursor-pointer ${
                        lang === l.code ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-slate-700'
                      }`}
                    >
                      <span>{l.nativeName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({l.name})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Slogan & Hero Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white py-4 px-4 shadow-inner">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">
              {ct.portalSubtitle}
            </p>
            <h2 className="text-lg font-bold text-white mt-0.5">
              {org.constituencySlogan || 'ప్రజల కోసం... ప్రజా సేవలో...'}
            </h2>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-xs px-3 py-1.5 rounded-full text-xs font-medium border border-white/20">
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>{ct.redressalCell}</span>
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 pt-4">
        {/* Navigation Tabs (Raise Grievance / Track Status) */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4 border border-slate-200">
          <button
            onClick={() => {
              setActiveTab('raise');
              setSubmittedTicket(null);
            }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${
              activeTab === 'raise'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {ct.tabRaise}
          </button>
          <button
            onClick={() => setActiveTab('track')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${
              activeTab === 'track'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {ct.tabTrack}
          </button>
        </div>

        {/* Tab 1: Raise Grievance */}
        {activeTab === 'raise' && (
          <div>
            {submittedTicket ? (
              /* Success Confirmation Card */
              <div className="bg-white rounded-2xl p-6 border border-emerald-200 shadow-sm text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                  {ct.successBadge}
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-2 font-mono">
                  {submittedTicket}
                </h2>
                <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
                  {ct.successMsgPrefix}{' '}
                  <strong className="text-slate-900">
                    {selectedWardObj?.name || 'Local Ward Crew'}
                  </strong>{' '}
                  {ct.successMsgSuffix}
                </p>

                {/* Ward Badge */}
                {selectedWardObj && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold mt-3 border border-blue-200">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{selectedWardObj.name}</span>
                  </div>
                )}

                {/* Evidence preview if uploaded */}
                {photoPreview && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 max-w-xs mx-auto">
                    <img
                      src={photoPreview}
                      alt="Submitted evidence"
                      className="w-full h-40 object-cover"
                    />
                    <div className="bg-slate-50 py-1.5 px-3 text-[11px] text-slate-500 font-medium">
                      {ct.evidenceLabel}
                    </div>
                  </div>
                )}

                <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{ct.complainantLabel}</span>
                    <span className="font-semibold text-slate-800">{citizenName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{ct.whatsappAlertLabel}</span>
                    <span className="font-semibold text-emerald-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> +91 {citizenPhone}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{ct.locationLabel}</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                      {locationName}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => {
                      setSubmittedTicket(null);
                      setPhotoPreview(null);
                      setAudioUrl(null);
                      setDescription('');
                    }}
                    className="px-6 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-100 transition text-sm cursor-pointer"
                  >
                    {ct.submitAnotherBtn}
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('track');
                      setTrackQuery(submittedTicket);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {ct.trackProgressBtn}
                  </button>
                </div>
              </div>
            ) : (
              /* Grievance Submission Form */
              <form onSubmit={handleSubmitComplaint} className="space-y-4">
                {/* 1. Universal Ward / Area Selector */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      {ct.step1Ward}
                    </label>
                    <span className="text-[11px] font-semibold text-blue-600">
                      {wards.length} {ct.wardsActive}
                    </span>
                  </div>

                  <div className="relative">
                    <select
                      value={selectedWardId}
                      onChange={(e) => setSelectedWardId(e.target.value)}
                      className="w-full h-12 pl-3.5 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-sm appearance-none cursor-pointer focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      required
                    >
                      {wards.map((ward) => (
                        <option key={ward.id} value={ward.id}>
                          {ward.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Ward Incharge hint */}
                  {selectedWardObj?.incharge_name && (
                    <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      {ct.wardIncharge} <strong className="text-slate-700">{selectedWardObj.incharge_name}</strong>
                    </p>
                  )}
                </div>

                {/* 2. Issue Category Touchpads */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                    {ct.step2Category}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {categories.map((cfg) => {
                      const Icon = cfg.icon;
                      const isSelected = category === cfg.key;
                      return (
                        <button
                          key={cfg.key}
                          type="button"
                          onClick={() => setCategory(cfg.key)}
                          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between h-20 cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className={`p-1.5 rounded-lg ${cfg.bg}`}>
                              <Icon className={`w-4 h-4 ${cfg.color}`} />
                            </div>
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                                <Check className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </div>
                          <span
                            className={`text-xs font-bold leading-tight ${
                              isSelected ? 'text-blue-900' : 'text-slate-700'
                            }`}
                          >
                            {cfg.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Live Location Card */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Navigation className="w-4 h-4 text-blue-600" />
                      {ct.step3Location}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowLocationModal(true)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      {ct.changeSearch}
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {gpsLoading ? ct.detectingGps : locationName || ct.detectingAddress}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : ct.waitingGps}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={requestGpsLocation}
                      disabled={gpsLoading}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 shrink-0 flex items-center gap-1 transition cursor-pointer"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 text-blue-600 ${gpsLoading ? 'animate-spin' : ''}`} />
                      <span>{ct.gpsButton}</span>
                    </button>
                  </div>
                </div>

                {/* 4. Issue Evidence (Camera + Voice Note) */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    {ct.step4Evidence}
                  </label>

                  {/* Photo Capture */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoCapture}
                      className="hidden"
                    />

                    {photoPreview ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200">
                        <img
                          src={photoPreview}
                          alt="Captured preview"
                          className="w-full h-48 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setPhotoPreview(null)}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[11px] px-2 py-0.5 rounded font-medium">
                          {ct.photoAttached}
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isCompressing}
                        className="w-full py-4 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50/50 hover:bg-blue-50 text-blue-700 flex flex-col items-center justify-center gap-1 transition cursor-pointer"
                      >
                        <Camera className="w-7 h-7 text-blue-600" />
                        <span className="text-sm font-bold">
                          {isCompressing ? ct.compressingPhoto : ct.takePhoto}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {ct.photoHint}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Voice Note Audio Pill */}
                  <div className="pt-1">
                    {audioUrl ? (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Volume2 className="w-5 h-5 text-blue-600 shrink-0" />
                          <audio src={audioUrl} controls className="h-8 max-w-[200px]" />
                        </div>
                        <button
                          type="button"
                          onClick={clearRecording}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition"
                          title="Delete Recording"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-full py-2.5 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                          isRecording
                            ? 'bg-red-50 border-red-300 text-red-700 animate-pulse'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        {isRecording ? (
                          <>
                            <MicOff className="w-4 h-4 text-red-600" />
                            <span>{ct.recordingVoice}</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-4 h-4 text-blue-600" />
                            <span>{ct.recordVoice}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Optional short description */}
                  <div className="pt-1">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={ct.detailsPlaceholder}
                      rows={2}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* 5. Citizen Details */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {ct.step5Citizen}
                    </label>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {ct.whatsappUpdatesBadge}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <input
                        type="text"
                        value={citizenName}
                        onChange={(e) => setCitizenName(e.target.value)}
                        placeholder={ct.namePlaceholder}
                        className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                        +91
                      </div>
                      <input
                        type="tel"
                        value={citizenPhone}
                        onChange={(e) => setCitizenPhone(e.target.value)}
                        maxLength={10}
                        placeholder={ct.phonePlaceholder}
                        className="w-full h-11 pl-12 pr-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-medium text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Big Submit CTA */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-500/25 flex flex-col items-center justify-center transition disabled:opacity-50 cursor-pointer active:scale-98"
                >
                  <span className="flex items-center gap-2">
                    <Send className="w-5 h-5" />
                    {isSubmitting ? ct.submittingBtn : ct.submitBtn}
                  </span>
                  <span className="text-[11px] font-normal text-blue-100 mt-0.5">
                    {ct.submitSubtitle}
                  </span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Track Grievance Status */}
        {activeTab === 'track' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                {ct.trackTitle}
              </h3>
              <form onSubmit={handleTrackComplaint} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={trackQuery}
                    onChange={(e) => setTrackQuery(e.target.value)}
                    placeholder={ct.trackPlaceholder}
                    className="w-full h-11 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={trackLoading}
                  className="h-11 px-5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition cursor-pointer"
                >
                  {trackLoading ? ct.searchingBtn : ct.trackSearchBtn}
                </button>
              </form>
            </div>

            {/* Results List */}
            {hasSearched && (
              <div className="space-y-3">
                {trackedComplaints.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500 text-sm">
                    {ct.noComplaintsFound}
                  </div>
                ) : (
                  trackedComplaints.map((item) => {
                    const statusText =
                      item.status === 'NEW'
                        ? ct.statusNew
                        : item.status === 'IN_PROGRESS'
                        ? ct.statusInProgress
                        : item.status === 'PENDING_APPROVAL'
                        ? ct.statusPendingApproval
                        : ct.statusResolved;

                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-blue-600 text-base">
                            {item.ticket_number}
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                              item.status === 'RESOLVED'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : item.status === 'IN_PROGRESS'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : item.status === 'PENDING_APPROVAL'
                                ? 'bg-purple-100 text-purple-800 border-purple-300'
                                : 'bg-blue-100 text-blue-800 border-blue-300'
                            }`}
                          >
                            {statusText}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-400">{ct.categoryLabel}</span>
                            <span className="font-semibold text-slate-800">{item.category}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">{ct.lodgedLabel}</span>
                            <span className="font-semibold text-slate-800">
                              {formatDateTime(item.created_at)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">{ct.locationLabel}</span>
                            <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                              {item.location_address || 'Mangalagiri'}
                            </span>
                          </div>
                        </div>

                        {/* Before / After Photos if available */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                          {item.before_photo_url && (
                            <div>
                              <span className="text-[10px] text-slate-400 font-semibold block mb-1">
                                {ct.evidenceLabel}
                              </span>
                              <img
                                src={item.before_photo_url}
                                alt="Before"
                                className="w-full h-24 object-cover rounded-lg border border-slate-200"
                              />
                            </div>
                          )}
                          {item.after_photo_url ? (
                            <div>
                              <span className="text-[10px] text-emerald-600 font-semibold block mb-1">
                                {ct.resolutionPhotoLabel}
                              </span>
                              <img
                                src={item.after_photo_url}
                                alt="After"
                                className="w-full h-24 object-cover rounded-lg border border-emerald-200"
                              />
                            </div>
                          ) : (
                            <div className="h-24 rounded-lg bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-center p-2">
                              <Clock className="w-4 h-4 mb-1" />
                              <span className="text-[10px]">{ct.statusInProgress}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
