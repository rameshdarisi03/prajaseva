'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Share2,
  Search,
  RotateCcw,
  Volume2,
  Sparkles,
  Phone,
  ShieldCheck,
  Send
} from 'lucide-react';
import { translations } from '@/lib/i18n';
import { SupportedLanguage, ComplaintCategory, Complaint } from '@/types';
import { compressImage } from '@/lib/imageCompression';
import { formatDateTime } from '@/lib/dateUtils';

export default function PublicCitizenPortal() {
  const [lang, setLang] = useState<SupportedLanguage>('te');
  const [activeTab, setActiveTab] = useState<'raise' | 'track'>('raise');

  const t = translations[lang];

  // ================= Form State =================
  const [citizenName, setCitizenName] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');
  const [citizenEmail, setCitizenEmail] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('DRAINAGE');
  const [description, setDescription] = useState('');
  
  // Location
  const [gpsLoading, setGpsLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState('');

  // Media
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio Recording
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // OTP Modal & Submission
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);

  // Tracking Tab State
  const [trackQuery, setTrackQuery] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackedComplaints, setTrackedComplaints] = useState<Complaint[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Auto detect GPS on component mount
  useEffect(() => {
    requestGpsLocation();
  }, []);

  // Real reverse geocode to get recognizable street / landmark / area name
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
          if (data.display_name) {
            return data.display_name.split(',').slice(0, 3).join(', ').trim();
          }
        }
      }
    } catch (e) {
      // Fallback to secondary fast geocoder
    }

    try {
      const res2 = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      if (res2.ok) {
        const d = await res2.json();
        const parts = [d.locality, d.city, d.principalSubdivision].filter(Boolean);
        if (parts.length > 0) return parts.join(', ');
      }
    } catch (e) {
      // ignore
    }

    return `GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  };

  const requestGpsLocation = () => {
    if (!navigator.geolocation) {
      setLocationName('GPS not supported on device');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        try {
          const address = await resolveExactAddress(latitude, longitude);
          setLocationName(address);
        } catch {
          setLocationName(`GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        console.warn('GPS Error:', err);
        setCoords({ lat: 16.4419, lng: 80.5649 }); // Fallback Mangalagiri coords
        setLocationName('Main Road, Mangalagiri');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Camera Capture Handler
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const { base64 } = await compressImage(file, 1280, 1280, 0.75);
      setPhotoPreview(base64);
    } catch (err) {
      console.error('Image compression failed:', err);
    } finally {
      setIsCompressing(false);
    }
  };

  // Voice Note Handler (Captures audio directly from user's phone microphone)
  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setAudioUrl(reader.result as string);
        };
        // Turn off phone microphone hardware indicator
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Audio recording not supported or permission denied:', err);
      alert('Could not access phone microphone. Please allow microphone permission in your browser.');
    }
  };

  // Delete Voice Recording to allow recording again fresh
  const handleDeleteAudio = () => {
    setAudioUrl(null);
    audioChunksRef.current = [];
  };

  // Proceed button -> Send WhatsApp OTP
  const handleProceedClick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoPreview) {
      alert(lang === 'te' ? 'దయచేసి సమస్య ఫోటో తీయండి' : 'Please take a photo of the problem');
      return;
    }
    if (!citizenPhone || citizenPhone.replace(/\D/g, '').length < 10) {
      alert(lang === 'te' ? 'దయచేసి సరైన 10 అంకెల మొబైల్ నంబర్ నమోదు చేయండి' : 'Please enter a valid 10-digit mobile number');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', phone: citizenPhone }),
      });
      const data = await res.json();
      if (data.success) {
        setShowOtpModal(true);
      } else {
        alert(data.error || 'Failed to send WhatsApp verification code. Please check your number.');
      }
    } catch (err) {
      console.error('Failed to send OTP:', err);
      alert('Network error while requesting WhatsApp code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify OTP and Submit Complaint
  const handleVerifyAndSubmit = async () => {
    if (!otpCode) return;
    try {
      setIsSubmitting(true);
      const otpRes = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', phone: citizenPhone, code: otpCode }),
      });
      const otpData = await otpRes.json();
      if (!otpData.success) {
        alert(otpData.error || 'Invalid OTP code');
        setIsSubmitting(false);
        return;
      }

      // Submit to database & Zoho
      const submitRes = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citizenName,
          citizenPhone,
          citizenEmail,
          category,
          description,
          latitude: coords?.lat || 16.4419,
          longitude: coords?.lng || 80.5649,
          locationAddress: locationName,
          photoBase64: photoPreview,
          voiceNoteUrl: audioUrl,
        }),
      });

      const submitData = await submitRes.json();
      if (submitData.success) {
        setSubmittedTicket(submitData.ticketNumber);
        setShowOtpModal(false);
      } else {
        alert(submitData.error || 'Failed to submit complaint');
      }
    } catch (err) {
      console.error('Submission failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Track Query Search
  const handleTrackSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackQuery.trim()) return;

    try {
      setTrackLoading(true);
      setHasSearched(true);
      const res = await fetch(`/api/complaints/track?q=${encodeURIComponent(trackQuery.trim())}`);
      const data = await res.json();
      setTrackedComplaints(data.complaints || []);
    } catch (err) {
      console.error('Tracking query failed:', err);
    } finally {
      setTrackLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* =========================================================================
          TOP BRANDING HEADER WITH INSTANT 1-TAP LANGUAGE SWITCHER
      ========================================================================== */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-600/20">
              🏛️
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                {t.appTitle}
              </h1>
              <p className="text-xs text-emerald-700 font-medium">
                Mangalagiri MLA Camp Office
              </p>
            </div>
          </div>

          {/* Language Selector Pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-full border border-slate-200">
            {(['te', 'en', 'hi'] as SupportedLanguage[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  lang === l
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {l === 'te' ? 'తెలుగు' : l === 'en' ? 'ENG' : 'हिंदी'}
              </button>
            ))}
          </div>
        </div>

        {/* =========================================================================
            SIDE-BY-SIDE DUAL TABS (RAISE COMPLAINT VS TRACK COMPLAINT)
        ========================================================================== */}
        <div className="max-w-xl mx-auto mt-3 grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('raise')}
            className={`py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'raise'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.tabRaise}
          </button>
          <button
            onClick={() => setActiveTab('track')}
            className={`py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'track'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.tabTrack}
          </button>
        </div>
      </header>

      {/* =========================================================================
          MAIN VIEWPORT CONTENT
      ========================================================================== */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 pb-28">
        {/* =====================================================================
            TAB 1: RAISE COMPLAINT FORM
        ====================================================================== */}
        {activeTab === 'raise' && (
          <div>
            {submittedTicket ? (
              /* Success Confirmation Card */
              <div className="bg-white rounded-2xl p-6 border border-emerald-200 shadow-sm text-center animate-in fade-in zoom-in-95">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">
                  {t.successTitle}
                </h2>
                <p className="text-sm text-slate-600 mb-6">
                  {t.successNote}
                </p>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
                  <span className="text-xs uppercase tracking-wider text-emerald-800 font-bold block mb-1">
                    {t.refLabel}
                  </span>
                  <span className="text-3xl font-black text-emerald-700 tracking-wider">
                    #{submittedTicket}
                  </span>
                </div>

                <div className="space-y-3">
                  <a
                    href={`https://wa.me/916360443162?text=Track%20${submittedTicket}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
                  >
                    <Send className="w-5 h-5" />
                    {t.btnWhatsAppTrack}
                  </a>

                  <button
                    onClick={() => {
                      setSubmittedTicket(null);
                      setPhotoPreview(null);
                      setDescription('');
                      setAudioUrl(null);
                    }}
                    className="w-full py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    {t.btnNewComplaint}
                  </button>
                </div>
              </div>
            ) : (
              /* The Frictionless 3-Click Public Form */
              <form onSubmit={handleProceedClick} className="space-y-5">
                {/* 1. Exact Location Banner (Auto GPS Tagged) */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        {t.step1Location}
                      </span>
                      <p className="text-sm font-bold text-slate-800 line-clamp-1">
                        {gpsLoading ? t.gpsDetecting : locationName || t.gpsSuccess}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={requestGpsLocation}
                    className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                    title="Refresh GPS"
                  >
                    <RotateCcw className={`w-4 h-4 ${gpsLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* 2. Photo Evidence (1-Tap Native Camera Trigger) */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
                    {t.step2Photo} *
                  </label>

                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={fileInputRef}
                    onChange={handlePhotoCapture}
                    className="hidden"
                  />

                  {photoPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 group">
                      <img
                        src={photoPreview}
                        alt="Grievance Evidence"
                        className="w-full h-52 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 bg-white text-slate-900 rounded-lg text-sm font-bold flex items-center gap-2 shadow"
                        >
                          <RotateCcw className="w-4 h-4" />
                          {t.photoRetake}
                        </button>
                      </div>
                      <div className="absolute bottom-2 left-2 bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow">
                        ✅ Captured
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-40 border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 rounded-xl flex flex-col items-center justify-center gap-2 transition-all"
                    >
                      <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
                        <Camera className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-bold text-emerald-900">
                        {isCompressing ? 'Processing photo...' : t.tapToPhoto}
                      </span>
                    </button>
                  )}
                </div>

                {/* 3. Category Touchpads (Big Visual Tiles) */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
                    {t.step3Category} *
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { key: 'DRAINAGE', icon: '🌊', label: t.catDrainage },
                      { key: 'ROADS', icon: '🕳️', label: t.catRoads },
                      { key: 'WATER', icon: '🚰', label: t.catWater },
                      { key: 'LIGHTS', icon: '💡', label: t.catLights },
                      { key: 'GARBAGE', icon: '🗑️', label: t.catGarbage },
                      { key: 'OTHER', icon: '➕', label: t.catOther },
                    ].map((cat) => (
                      <button
                        type="button"
                        key={cat.key}
                        onClick={() => setCategory(cat.key as ComplaintCategory)}
                        className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                          category === cat.key
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-sm ring-1 ring-emerald-600'
                            : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100 font-medium'
                        }`}
                      >
                        <span className="text-2xl">{cat.icon}</span>
                        <span className="text-xs leading-tight">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Voice Note & Details (Audio or Text) */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {t.step4Details}
                    </label>
                    <span className="text-xs text-slate-400">(Optional)</span>
                  </div>

                  {/* 1-Tap Voice Recorder / Audio Player Block with Delete Option */}
                  {audioUrl && !isRecording ? (
                    <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                          {t.playAudio}
                        </span>
                        <button
                          type="button"
                          onClick={handleDeleteAudio}
                          className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 text-xs font-bold rounded-lg border border-rose-200 shadow-xs transition-colors"
                          title="Delete recording and record again"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          <span>{t.deleteAudio}</span>
                        </button>
                      </div>
                      <audio src={audioUrl} controls className="h-8 w-full" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={toggleRecording}
                        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                          isRecording
                            ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-600/30 ring-4 ring-rose-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                        }`}
                      >
                        {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                      </button>
                      <div className="flex-1">
                        <span className="text-xs font-bold text-slate-800 block">
                          {isRecording ? t.recording : t.holdToRecord}
                        </span>
                        <p className="text-[11px] text-slate-500">
                          {isRecording ? 'Tap mic again to finish' : 'Speak your issue in your language'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Short text description */}
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t.descriptionPlaceholder}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800 placeholder:text-slate-400 resize-none"
                  />
                </div>

                {/* 5. Citizen Contact Details */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    {t.step5Contact}
                  </label>

                  <div>
                    <input
                      type="text"
                      required
                      value={citizenName}
                      onChange={(e) => setCitizenName(e.target.value)}
                      placeholder={t.nameLabel}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800"
                    />
                  </div>

                  <div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm font-semibold">
                        +91
                      </div>
                      <input
                        type="tel"
                        maxLength={10}
                        required
                        value={citizenPhone}
                        onChange={(e) => setCitizenPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="WhatsApp Number (10 digits) *"
                        className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <input
                      type="email"
                      value={citizenEmail}
                      onChange={(e) => setCitizenEmail(e.target.value)}
                      placeholder={t.emailLabel}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800"
                    />
                  </div>
                </div>

                {/* Pinned Bottom CTA (Thumb-Zone Optimized) */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 z-20 pb-safe">
                  <div className="max-w-xl mx-auto">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-base rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span>{t.submitting}</span>
                      ) : (
                        <>
                          <span>{t.btnProceed}</span>
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* =====================================================================
            TAB 2: TRACK COMPLAINT TAB
        ====================================================================== */}
        {activeTab === 'track' && (
          <div className="space-y-4">
            {/* Search Input Box */}
            <form onSubmit={handleTrackSearch} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                {t.trackTitle}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={trackQuery}
                  onChange={(e) => setTrackQuery(e.target.value)}
                  placeholder={t.trackInputPlaceholder}
                  className="w-full pl-10 pr-24 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-900"
                />
                <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                <button
                  type="submit"
                  disabled={trackLoading}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  {trackLoading ? '...' : t.btnSearch}
                </button>
              </div>
            </form>

            {/* Track Results */}
            {hasSearched && (
              <div className="space-y-4">
                {trackedComplaints.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500">
                    <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold">No complaints found matching "{trackQuery}"</p>
                    <p className="text-xs text-slate-400 mt-1">Check your reference number or mobile number</p>
                  </div>
                ) : (
                  trackedComplaints.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4"
                    >
                      {/* Ticket Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <span className="text-lg font-black text-slate-900 tracking-wide">
                            #{c.ticket_number}
                          </span>
                          <span className="text-xs text-slate-500 block">
                            {formatDateTime(c.created_at)}
                          </span>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            c.status === 'RESOLVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'PENDING_APPROVAL'
                              ? 'bg-blue-100 text-blue-800'
                              : c.status === 'IN_PROGRESS'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {c.status === 'RESOLVED'
                            ? t.statusResolved
                            : c.status === 'PENDING_APPROVAL'
                            ? t.statusVerification
                            : c.status === 'IN_PROGRESS'
                            ? t.statusProgress
                            : t.statusNew}
                        </span>
                      </div>

                      {/* Grievance Details */}
                      <div>
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                          {c.category} • {c.location_address || 'Mangalagiri'}
                        </div>
                        {c.description && (
                          <p className="text-sm text-slate-700 mt-1">{c.description}</p>
                        )}
                      </div>

                      {/* Before / After Photos Preview */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 block mb-1">
                            {t.viewBefore}
                          </span>
                          <img
                            src={c.before_photo_url}
                            alt="Before"
                            className="w-full h-32 object-cover rounded-xl border border-slate-200"
                          />
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 block mb-1">
                            {t.viewAfter}
                          </span>
                          {c.after_photo_url ? (
                            <img
                              src={c.after_photo_url}
                              alt="After"
                              className="w-full h-32 object-cover rounded-xl border border-emerald-300"
                            />
                          ) : (
                            <div className="w-full h-32 rounded-xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400 font-medium text-center p-2">
                              {c.status === 'IN_PROGRESS'
                                ? 'Volunteer on ground...'
                                : 'Pending resolution'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* If Resolved: 1-Tap Share to WhatsApp */}
                      {c.status === 'RESOLVED' && c.poster_url && (
                        <div className="pt-2 border-t border-slate-100">
                          <a
                            href={`whatsapp://send?text=Problem%20Resolved%20at%20Ward%204!%20Check%20resolution%20poster:%20${encodeURIComponent(c.poster_url)}`}
                            className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-emerald-200 transition-colors"
                          >
                            <Share2 className="w-4 h-4" />
                            {t.sharePoster}
                          </a>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* =========================================================================
          WHATSAPP OTP VERIFICATION MODAL
      ========================================================================== */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 space-y-5 animate-in slide-in-from-bottom pb-safe">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{t.otpTitle}</h3>
              <p className="text-xs text-slate-500 mt-1">
                {t.otpSubtitle}: <span className="font-bold text-slate-800">+91 {citizenPhone}</span>
              </p>
            </div>

            <div>
              <input
                type="text"
                maxLength={6}
                autoFocus
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="6-digit code"
                className="w-full py-3.5 text-center text-2xl tracking-[0.5em] font-black rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleVerifyAndSubmit}
                disabled={otpCode.length < 6 || isSubmitting}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50 transition-all"
              >
                {isSubmitting ? 'Verifying...' : t.btnVerify}
              </button>

              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="w-full py-2 text-xs text-slate-500 font-semibold hover:text-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
