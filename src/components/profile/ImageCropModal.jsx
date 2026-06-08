import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Check, X } from 'lucide-react';

const SIZE = 260; // circle diameter in px
const MIN_SCALE = 1;
const MAX_SCALE = 4;

export default function ImageCropModal({ open, onOpenChange, imageSrc, onConfirm }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Drag state
  const isDragging = useRef(false);
  const dragOrigin = useRef({ x: 0, y: 0 });
  const posRef = useRef({ x: 0, y: 0 });

  // Pinch state
  const lastPinchDist = useRef(null);
  const scaleRef = useRef(1);

  // Reset when opening
  useEffect(() => {
    if (imageSrc && open) {
      setScale(1);
      setPos({ x: 0, y: 0 });
      scaleRef.current = 1;
      posRef.current = { x: 0, y: 0 };
    }
  }, [imageSrc, open]);

  const clamp = useCallback((x, y, s) => {
    const maxOff = Math.max(0, (SIZE * s - SIZE) / 2);
    return {
      x: Math.max(-maxOff, Math.min(maxOff, x)),
      y: Math.max(-maxOff, Math.min(maxOff, y)),
    };
  }, []);

  // ── Pointer (mouse + single-finger touch) drag ──
  const onPointerDown = (e) => {
    // Ignore if two fingers are on screen (handled by touch events)
    if (e.pointerType === 'touch') return;
    e.preventDefault();
    isDragging.current = true;
    dragOrigin.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y };
  };

  const onPointerMove = (e) => {
    if (!isDragging.current || e.pointerType === 'touch') return;
    const rawX = e.clientX - dragOrigin.current.x;
    const rawY = e.clientY - dragOrigin.current.y;
    const clamped = clamp(rawX, rawY, scaleRef.current);
    posRef.current = clamped;
    setPos(clamped);
  };

  const onPointerUp = () => { isDragging.current = false; };

  // ── Touch events (drag + pinch) ──
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Pinch start — record distance
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.hypot(dx, dy);
    } else if (e.touches.length === 1) {
      isDragging.current = true;
      dragOrigin.current = {
        x: e.touches[0].clientX - posRef.current.x,
        y: e.touches[0].clientY - posRef.current.y,
      };
    }
  };

  const onTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      // Pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (lastPinchDist.current) {
        const delta = (dist - lastPinchDist.current) / 150;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scaleRef.current + delta));
        scaleRef.current = newScale;
        const clamped = clamp(posRef.current.x, posRef.current.y, newScale);
        posRef.current = clamped;
        setScale(newScale);
        setPos(clamped);
      }
      lastPinchDist.current = dist;
    } else if (e.touches.length === 1 && isDragging.current) {
      // Single finger drag
      const rawX = e.touches[0].clientX - dragOrigin.current.x;
      const rawY = e.touches[0].clientY - dragOrigin.current.y;
      const clamped = clamp(rawX, rawY, scaleRef.current);
      posRef.current = clamped;
      setPos(clamped);
    }
  };

  const onTouchEnd = (e) => {
    if (e.touches.length < 2) lastPinchDist.current = null;
    if (e.touches.length === 0) isDragging.current = false;
  };

  const changeScale = (delta) => {
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scaleRef.current + delta));
    scaleRef.current = newScale;
    const clamped = clamp(posRef.current.x, posRef.current.y, newScale);
    posRef.current = clamped;
    setScale(newScale);
    setPos(clamped);
  };

  const handleConfirm = () => {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    const img = new Image();
    img.onload = () => {
      // Maintain aspect ratio — fit shortest side to SIZE, then scale
      const aspect = img.naturalWidth / img.naturalHeight;
      let baseW, baseH;
      if (aspect >= 1) { baseH = SIZE; baseW = SIZE * aspect; }
      else { baseW = SIZE; baseH = SIZE / aspect; }

      const drawW = baseW * scaleRef.current;
      const drawH = baseH * scaleRef.current;
      const drawX = (SIZE - drawW) / 2 + posRef.current.x;
      const drawY = (SIZE - drawH) / 2 + posRef.current.y;
      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      canvas.toBlob((blob) => {
        onConfirm(blob);
        onOpenChange(false);
      }, 'image/jpeg', 0.9);
    };
    img.src = imageSrc;
  };

  if (!imageSrc) return null;

  // Image dimensions: maintain natural aspect ratio, cover the circle
  const imgStyle = (() => {
    // We don't know natural dimensions here, so use object-fit trick via a wrapper
    return {
      position: 'absolute',
      width: SIZE * scale,
      height: SIZE * scale,
      top: '50%',
      left: '50%',
      transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
      objectFit: 'cover',
      userSelect: 'none',
      pointerEvents: 'none',
    };
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="font-nunito">Crop Photo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <p className="text-xs text-muted-foreground text-center">Drag or pinch to adjust</p>

          {/* Circle crop area */}
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-full border-4 border-primary shadow-lg cursor-grab active:cursor-grabbing select-none touch-none"
            style={{ width: SIZE, height: SIZE, flexShrink: 0 }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <img
              src={imageSrc}
              alt="crop"
              draggable={false}
              style={imgStyle}
            />
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => changeScale(-0.25)} disabled={scale <= MIN_SCALE}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold w-12 text-center">{Math.round(scale * 100)}%</span>
            <Button variant="outline" size="icon" onClick={() => changeScale(0.25)} disabled={scale >= MAX_SCALE}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 w-full">
            <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button className="flex-1 rounded-2xl" onClick={handleConfirm}>
              <Check className="w-4 h-4 mr-1" /> Use Photo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}