'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  MapPin,
  Search,
  Crosshair,
  X,
  Check,
  Navigation,
  Loader2,
  Building,
} from 'lucide-react';
import { SupportedLanguage } from '@/types';

// Dynamically import Leaflet map with SSR disabled for Next.js Turbopack
const InteractiveMap = dynamic(() => import('./InteractiveMap'), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 text-xs font-semibold">
      Loading interactive map...
    </div>
  ),
});

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLat: number;
  currentLng: number;
  currentAddress: string;
  onConfirm: (lat: number, lng: number, address: string) => void;
  lang?: SupportedLanguage;
}

interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
  };
}

export default function LocationPickerModal({
  isOpen,
  onClose,
  currentLat,
  currentLng,
  currentAddress,
  onConfirm,
  lang = 'te',
}: LocationPickerModalProps) {
  const [selectedLat, setSelectedLat] = useState(currentLat || 12.9716);
  const [selectedLng, setSelectedLng] = useState(currentLng || 77.5946);
  const [address, setAddress] = useState(currentAddress || 'Detecting address...');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isGpsLocating, setIsGpsLocating] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with props when modal opens
  useEffect(() => {
    if (isOpen) {
      if (currentLat && currentLng) {
        setSelectedLat(currentLat);
        setSelectedLng(currentLng);
      }
      if (currentAddress) {
        setAddress(currentAddress);
      }
    }
  }, [isOpen, currentLat, currentLng, currentAddress]);

  // Reverse geocodes coordinates to street / area name
  const reverseGeocode = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: { 'Accept-Language': 'en', 'User-Agent': 'PrajaSeva-LocationPicker/1.0' },
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
          const city = a.city || a.town || a.village || a.county || a.state_district;
          const parts = [street, area, city].filter(Boolean);
          if (parts.length > 0) {
            setAddress(parts.join(', '));
            return;
          }
        }
        if (data?.display_name) {
          setAddress(data.display_name.split(',').slice(0, 3).join(', ').trim());
          return;
        }
      }
    } catch {
      // Fallback
    }

    setAddress(`Spot (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
    setIsGeocoding(false);
  };

  // Debounced search query handler
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchQuery.trim()
          )}&countrycodes=in&limit=5&addressdetails=1`,
          {
            headers: { 'User-Agent': 'PrajaSeva-Search/1.0', 'Accept-Language': 'en' },
          }
        );
        if (res.ok) {
          const results = await res.json();
          setSearchResults(results || []);
        }
      } catch (err) {
        console.warn('Search query error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 450);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  // Handle map center change (as user drags map)
  const handleMapCenterChange = (newLat: number, newLng: number) => {
    setSelectedLat(newLat);
    setSelectedLng(newLng);
    reverseGeocode(newLat, newLng);
  };

  // 1-Tap "Use Current Location" (Hardware Satellite GPS)
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('GPS is not supported on this device');
      return;
    }

    setIsGpsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setSelectedLat(latitude);
        setSelectedLng(longitude);
        reverseGeocode(latitude, longitude);
        setIsGpsLocating(false);
      },
      async (err) => {
        console.warn('Hardware GPS timeout, falling back to network lookup:', err);
        try {
          const res = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en');
          if (res.ok) {
            const d = await res.json();
            if (d.latitude && d.longitude) {
              setSelectedLat(d.latitude);
              setSelectedLng(d.longitude);
              reverseGeocode(d.latitude, d.longitude);
            }
          }
        } catch {
          // ignore
        } finally {
          setIsGpsLocating(false);
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Handle selecting a place from search suggestions
  const handleSelectSearchResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setSelectedLat(lat);
    setSelectedLng(lng);

    const a = result.address;
    const parts = [
      a?.road,
      a?.suburb,
      a?.city || a?.town || a?.village
    ].filter(Boolean);

    setAddress(parts.length > 0 ? parts.join(', ') : result.display_name.split(',').slice(0, 3).join(', ').trim());
    setSearchQuery('');
    setSearchResults([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header with Title and Close Button */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {lang === 'te' ? 'సమస్య ఉన్న ప్రదేశాన్ని ఎంచుకోండి' : 'Select Problem Location'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {lang === 'te' ? 'లొకేషన్ కోసం వెతకండి లేదా మ్యాప్‌లో పిన్ ఉంచండి' : 'Search landmark or drag map to set exact spot'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar Input */}
        <div className="p-3 border-b border-slate-100 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'te' ? 'వీధి, కాలనీ, ల్యాండ్‌మార్క్ లేదా దుకాణం పేరు రాయండి...' : 'Search street, area, landmark, colony...'}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 placeholder:text-slate-400 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 1-Tap "Use Current Location" (Auto GPS) Button */}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isGpsLocating}
            className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between transition-colors shadow-xs"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                {isGpsLocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
              </div>
              <div className="text-left">
                <span className="block leading-tight font-extrabold text-emerald-900">
                  {lang === 'te' ? '🎯 ప్రస్తుత లొకేషన్ ఉపయోగించండి (Auto GPS)' : '🎯 Use Current Location (Auto GPS)'}
                </span>
                <span className="text-[10px] text-emerald-700 font-normal">
                  {lang === 'te' ? 'ఫోన్ శాటిలైట్ GPS ద్వారా స్వయంచాలకంగా గుర్తిస్తుంది' : 'Pinpoint exact location using phone GPS'}
                </span>
              </div>
            </div>
            <Navigation className="w-4 h-4 text-emerald-700" />
          </button>
        </div>

        {/* Search Results Dropdown List */}
        {searchResults.length > 0 && (
          <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border-b border-slate-100 bg-white">
            {searchResults.map((r) => (
              <button
                key={r.place_id}
                type="button"
                onClick={() => handleSelectSearchResult(r)}
                className="w-full p-3 text-left hover:bg-emerald-50 flex items-start gap-2.5 transition-colors"
              >
                <Building className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-slate-800 block truncate">
                    {r.address?.road || r.display_name.split(',')[0]}
                  </span>
                  <span className="text-[11px] text-slate-500 block truncate">
                    {r.display_name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Interactive Map View */}
        <div className="p-3 flex-1 flex flex-col space-y-2">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-bold text-slate-700">
              {lang === 'te' ? 'మ్యాప్‌లో పిన్ చూడండి:' : 'Move map to adjust spot:'}
            </span>
            <span className="text-[11px] text-emerald-700 font-mono font-bold">
              GPS: {selectedLat.toFixed(4)}, {selectedLng.toFixed(4)}
            </span>
          </div>

          <InteractiveMap
            lat={selectedLat}
            lng={selectedLng}
            onCenterChange={handleMapCenterChange}
            className="h-60 sm:h-72 w-full"
          />
        </div>

        {/* Bottom Address Confirmation Bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3 pb-safe">
          <div className="flex items-start gap-2.5 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {lang === 'te' ? 'ఎంచుకున్న చిరునామా' : 'SELECTED LOCATION ADDRESS'}
              </span>
              <p className="text-xs font-bold text-slate-900 line-clamp-2">
                {isGeocoding ? (
                  <span className="text-slate-400 animate-pulse">Detecting address...</span>
                ) : (
                  address
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onConfirm(selectedLat, selectedLng, address);
              onClose();
            }}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.99]"
          >
            <Check className="w-4 h-4" />
            <span>{lang === 'te' ? 'ఈ లొకేషన్ ధృవీకరించండి ➔' : 'Confirm & Use This Location ➔'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
