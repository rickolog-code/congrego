import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Check, X } from 'lucide-react';

const OUTPUT  = 260;   // final exported canvas size (px)
const STAGE   = 300;   // dark drag-zone size
const CIRCLE  = 240;   // visible circle diameter
const MIN_SCALE = 0.4; // allow zooming out to see the whole image
const MAX_SCALE = 4;

export default function ImageCropModal({ open, onOpenChange, imageSrc, onConfirm }) {
  const [scale, setScale]           = useState(1);
  const [pos,   setPos]             = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: CIRCLE, h: CIRCLE });

  // Keep refs in sync for handlers that close over stale state
  const scaleRef       = useRef(1);
  const posRef         = useRef({ x: 0, y: 0 });
  const naturalSizeRef = useRef({ w: CIRCLE, h: CIRCLE });
  const isDragging     = useRef(false);
  const dragOrigin     = useRef({ x: 0, y: 0 });
  const lastPinchDist  = useRef(null);

  // ── Reset whenever a new image is opened ────────────────────────────────────
  useEffect(() => {
    if (!imageSrc || !open) return;
    const img = new Image();
    img.onload = () => {
      const aspect = img.naturalWidth / img.naturalHeight;
      // Fit the short side to CIRCLE so the image fills the circle by default
      const baseW = aspect >= 1 ? CIRCLE * aspect : CIRCLE;
      const baseH = aspect >= 1 ? CIRCLE          : CIRCLE / aspect;
      naturalSizeRef.current = { w: baseW, h: baseH };
      setNaturalSize({ w: baseW, h: baseH });
      scaleRef.current = 1;
      posRef.current   = { x: 0, y: 0 };
      setScale(1);
      setPos({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc, open]);

  // ── Pointer drag (mouse + single touch via pointer-capture) ─────────────────
  const onPointerDown = (e) => {
    e.preventDefault();
    isDragging.current = true;
    dragOrigin.current = {
      x: e.clientX - posRef.current.x,
      y: e.clientY - posRef.current.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!isDragging.current) return;
    e.preventDefault();
    // No clamping — let the user pan anywhere they like
    const next = { x: e.clientX - dragOrigin.current.x, y: e.clientY - dragOrigin.current.y };
    posRef.current = next;
    setPos(next);
  };

  const onPointerUp = () => { isDragging.current = false; };

  // ── Two-finger pinch zoom ────────────────────────────────────────────────────
  const onTouchStart = (e) => {
    e.stopPropagation();
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.hypot(dx, dy);
    }
  };

  const onTouchMove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.touches.length === 2 && lastPinchDist.current !== null) {
      const dx   = e.touches[0].clientX - e.touches[1].clientX;
      const dy   = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const delta    = (dist - lastPinchDist.current) / 150;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scaleRef.current + delta));
      scaleRef.current = newScale;
      setScale(newScale);
      lastPinchDist.current = dist;
    }
  };

  const onTouchEnd = (e) => {
    if (e.touches.length < 2) lastPinchDist.current = null;
  };

  // ── Button zoom ──────────────────────────────────────────────────────────────
  const changeScale = (delta) => {
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scaleRef.current + delta));
    scaleRef.current = newScale;
    setScale(newScale);
  };

  // ── Export ───────────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    const canvas = document.createElement('canvas');
    canvas.width  = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext('2d');

    // Clip to circle
    ctx.beginPath();
    ctx.arc(OUTPUT / 2, OUTPUT / 2, OUTPUT / 2, 0, Math.PI * 2);
    ctx.clip();

    const img = new Image();
    img.onload = () => {
      const aspect = img.naturalWidth / img.naturalHeight;
      const baseW  = aspect >= 1 ? CIRCLE * aspect : CIRCLE;
      const baseH  = aspect >= 1 ? CIRCLE          : CIRCLE / aspect;

      const ratio = OUTPUT / CIRCLE;
      const drawW = baseW * scaleRef.current * ratio;
      const drawH = baseH * scaleRef.current * ratio;
      const drawX = (OUTPUT - drawW) / 2 + posRef.current.x * ratio;
      const drawY = (OUTPUT - drawH) / 2 + posRef.current.y * ratio;
      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      canvas.toBlob((blob) => {
        onConfirm(blob);
        onOpenChange(false);
      }, 'image/jpeg', 0.9);
    };
    img.src = imageSrc;
  };

  if (!imageSrc) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-sm mx-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-center">Crop Photo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <p className="text-xs text-muted-foreground text-center">
            Drag to reposition · pinch or use buttons to zoom
          </p>

          {/*
           * Stage — dark background so the image floats cleanly.
           * overflow:hidden clips the image to the square; the SVG overlay
           * then darkens everything outside the circle.
           */}
          <div
            className="relative select-none touch-none rounded-2xl"
            style={{
              width:    STAGE,
              height:   STAGE,
              background: '#111',
              overflow: 'hidden',
              cursor:   isDragging.current ? 'grabbing' : 'grab',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* The photo — free to move anywhere */}
            <img
              src={imageSrc}
              alt="crop preview"
              draggable={false}
              style={{
                position:     'absolute',
                width:        naturalSize.w * scale,
                height:       naturalSize.h * scale,
                top:          '50%',
                left:         '50%',
                transform:    `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                objectFit:    'cover',
                userSelect:   'none',
                pointerEvents:'none',
              }}
            />

            {/* SVG overlay: dark scrim outside circle + glowing ring */}
            <svg
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
              width={STAGE}
              height={STAGE}
            >
              <defs>
                {/* Punch a hole where the circle is */}
                <mask id="icm-hole">
                  <rect width={STAGE} height={STAGE} fill="white" />
                  <circle cx={STAGE / 2} cy={STAGE / 2} r={CIRCLE / 2} fill="black" />
                </mask>

                {/* Glow filter for the ring */}
                <filter id="icm-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Dark scrim outside the circle */}
              <rect
                width={STAGE} height={STAGE}
                fill="rgba(0,0,0,0.65)"
                mask="url(#icm-hole)"
              />

              {/* Outer soft glow ring */}
              <circle
                cx={STAGE / 2} cy={STAGE / 2} r={CIRCLE / 2}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="14"
                strokeOpacity="0.3"
                filter="url(#icm-glow)"
              />

              {/* Crisp inner ring */}
              <circle
                cx={STAGE / 2} cy={STAGE / 2} r={CIRCLE / 2}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2.5"
              />
            </svg>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline" size="icon"
              onClick={() => changeScale(-0.2)}
              disabled={scale <= MIN_SCALE}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold w-14 text-center tabular-nums">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="outline" size="icon"
              onClick={() => changeScale(0.2)}
              disabled={scale >= MAX_SCALE}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              className="flex-1 rounded-2xl"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button
              className="flex-1 rounded-2xl"
              onClick={handleConfirm}
            >
              <Check className="w-4 h-4 mr-1" /> Use Photo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}