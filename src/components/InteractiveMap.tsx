'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface InteractiveMapProps {
  lat: number;
  lng: number;
  onCenterChange: (lat: number, lng: number) => void;
  className?: string;
}

export default function InteractiveMap({
  lat,
  lng,
  onCenterChange,
  className = 'h-72 w-full',
}: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const isInternalMoveRef = useRef(false);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize map instance
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: false,
      });

      // OpenStreetMap high-speed tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add zoom control to bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Listen for pan / drag end events
      map.on('moveend', () => {
        if (isInternalMoveRef.current) {
          isInternalMoveRef.current = false;
          return;
        }
        const center = map.getCenter();
        onCenterChange(center.lat, center.lng);
      });

      mapInstanceRef.current = map;
    }

    return () => {
      // Clean up on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map center when props change from external search or GPS
  useEffect(() => {
    if (mapInstanceRef.current) {
      const currentCenter = mapInstanceRef.current.getCenter();
      const distance = Math.hypot(currentCenter.lat - lat, currentCenter.lng - lng);
      // Only pan if distance is significant
      if (distance > 0.0001) {
        isInternalMoveRef.current = true;
        mapInstanceRef.current.setView([lat, lng], 17, { animate: true });
      }
    }
  }, [lat, lng]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200 shadow-inner ${className}`}>
      {/* Map DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Ola/Rapido Center Pin Marker (Fixed in center) */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 -translate-y-4">
        <div className="flex flex-col items-center">
          {/* Badge */}
          <div className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md mb-1 animate-bounce">
            Spot
          </div>
          {/* Pin Icon */}
          <div className="w-8 h-8 rounded-full bg-rose-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-base">
            📍
          </div>
          {/* Pin Pointer / Dot */}
          <div className="w-2 h-2 bg-slate-900/40 rounded-full mt-0.5 blur-[1px]" />
        </div>
      </div>
    </div>
  );
}
