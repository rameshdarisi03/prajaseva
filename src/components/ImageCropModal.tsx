'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Check, Upload, Move } from 'lucide-react';

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  aspectRatio?: 'circle' | 'square';
  title?: string;
  onCrop: (croppedDataUrl: string) => void;
  onClose: () => void;
}

export default function ImageCropModal({
  isOpen,
  imageSrc,
  aspectRatio = 'circle',
  title = 'Adjust & Crop Photo',
  onCrop,
  onClose,
}: ImageCropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [naturalDimensions, setNaturalDimensions] = useState({ width: 0, height: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Load image when imageSrc changes
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setNaturalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Handle Dragging / Panning (Touch & Mouse)
  const handlePointerDown = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setOffset({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Perform Final Crop on Canvas
  const handleConfirmCrop = useCallback(() => {
    if (!imgRef.current) return;
    const img = imgRef.current;

    const outputSize = 400; // 400x400 high-res output
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Viewport diameter in the UI is 240px
    const viewportSize = 240;
    const scaleFactor = outputSize / viewportSize;

    // Base fitting dimensions
    const containerRatio = 1;
    const imgRatio = img.width / img.height;
    let baseWidth, baseHeight;

    if (imgRatio > containerRatio) {
      baseHeight = viewportSize;
      baseWidth = viewportSize * imgRatio;
    } else {
      baseWidth = viewportSize;
      baseHeight = viewportSize / imgRatio;
    }

    const currentWidth = baseWidth * zoom;
    const currentHeight = baseHeight * zoom;

    // Center coordinates
    const centerX = viewportSize / 2 + offset.x;
    const centerY = viewportSize / 2 + offset.y;

    const drawX = (centerX - currentWidth / 2) * scaleFactor;
    const drawY = (centerY - currentHeight / 2) * scaleFactor;
    const drawW = currentWidth * scaleFactor;
    const drawH = currentHeight * scaleFactor;

    // Background fill
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, outputSize, outputSize);

    // Draw image with zoom and offset
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onCrop(croppedDataUrl);
    onClose();
  }, [offset, zoom, onCrop, onClose]);

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="relative bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport / Drag Area */}
        <div className="p-6 flex flex-col items-center justify-center bg-slate-950/70 select-none">
          <div
            ref={containerRef}
            className="relative w-64 h-64 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center cursor-grab active:cursor-grabbing border border-slate-800 touch-none"
            onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
            onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={(e) => {
              if (e.touches[0]) handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchMove={(e) => {
              if (e.touches[0]) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchEnd={handlePointerUp}
          >
            {/* The Image being panned/zoomed */}
            {imageSrc && (
              <img
                src={imageSrc}
                alt="Crop preview"
                className="max-w-none pointer-events-none transition-transform duration-75"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  maxHeight: '100%',
                  objectFit: 'contain',
                }}
              />
            )}

            {/* Circular or Square Viewport Overlay Mask */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {aspectRatio === 'circle' ? (
                <div className="w-56 h-56 rounded-full border-3 border-amber-400 shadow-[0_0_0_9999px_rgba(10,15,30,0.75)] relative">
                  <div className="absolute inset-0 rounded-full border border-amber-300/40" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <div className="w-full h-px bg-white/40" />
                    <div className="h-full w-px bg-white/40 absolute" />
                  </div>
                </div>
              ) : (
                <div className="w-56 h-56 rounded-2xl border-3 border-amber-400 shadow-[0_0_0_9999px_rgba(10,15,30,0.75)] relative">
                  <div className="absolute inset-0 rounded-2xl border border-amber-300/40" />
                </div>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1.5 font-medium">
            <span>👆 Drag photo to position face in the circle</span>
          </p>
        </div>

        {/* Zoom Slider Control */}
        <div className="px-6 py-3 bg-slate-900 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1 font-semibold">
              <ZoomOut className="w-3.5 h-3.5" /> Zoom
            </span>
            <span className="font-mono text-amber-400 font-bold">{Math.round(zoom * 100)}%</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="0.6"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-amber-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, z + 0.15))}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Reset Zoom & Pan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmCrop}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition cursor-pointer active:scale-98"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>✓ Apply Crop & Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}
