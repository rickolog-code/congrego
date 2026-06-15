import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Check, X } from 'lucide-react';

const OUTPUT    = 260;   // exported image size (px)
const STAGE     = 340;   // pointer-capture zone — larger than circle for comfortable dragging
const CIRCLE    = 240;   // visible crop circle diameter
const MIN_SCALE = 0.4;   // allow zooming out to see the full image
const MAX_SCALE = 4;

export default function ImageCropModal({ open, onOpenChange, imageSrc, onConfirm }) {
  const [scale,       setScale]       = useState(1);
  const [pos,         setPos]         = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: CIRCLE, h: CIRCLE });

  const scaleRef      = useRef(1);
  const posRef        = useRef({ x: 0, y: 0 });
  const isDragging    = useRef(false);
  const dragOrigin    = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef(null);

  // ── Reset on open ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!imageSrc || !open) return;
    const img = new Image();
    img.onload = () => {
      const aspect = img.naturalWidth / img.naturalHeight;
      // Fit the short edge to CIRCLE so the image starts filling the circle
      const baseW = aspect >= 1 ? CIRCLE * aspect : CIRCLE;
      const baseH = aspect >= 1 ? CIRCLE           : CIRCLE / aspect;
      setNaturalSize({ w: baseW, h: baseH });
      scaleRef.current = 1;
      posRef.current   = { x: 0, y: 0 };
      setScale(1);
      setPos({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc, open]);

  // ── Pointer drag (works with setPointerCapture — finger can leave stage) ────
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
    // No clamping — pan anywhere
    const next = { x: e.clientX - dragOrigin.current.x, y: e.clientY - dragOrigin.current.y };
    posRef.current = next;
    setPos(next);
  };

  const onPointerUp = () => { isDragging.current = false; };

  // ── Pinch zoom ───────────────────────────────────────────────────────────────
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

    ctx.beginPath();
    ctx.arc(OUTPUT / 2, OUTPUT / 2, OUTPUT / 2, 0, Math.PI * 2);
    ctx.clip();

    const img = new Image();
    img.onload = () => {
      const aspect = img.naturalWidth / img.naturalHeight;
      const baseW  = aspect >= 1 ? CIRCLE * aspect : CIRCLE;
      const baseH  = aspect >= 1 ? CIRCLE           : CIRCLE / aspect;

      // Scale from CIRCLE-space to OUTPUT-space
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

  // How far the circle sits from the stage edge
  const offset = (STAGE - CIRCLE) / 2; // 50 px

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
           * STAGE — transparent, no overflow-clip.
           * setPointerCapture means the drag keeps working even if the finger
           * slides outside this box, so the user can pan as far as they like.
           */}
          <div
            className="relative select-none touch-none"
            style={{
              width:  STAGE,
              height: STAGE,
              cursor: isDragging.current ? 'grabbing' : 'grab',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/*
             * CIRCULAR VIEWPORT
             * border-radius:50% + overflow:hidden clips the image to a perfect
             * circle. Nothing renders outside this div, so the white modal
             * background shows through — no dark scrim needed.
             */}
            <div
              style={{
                position:     'absolute',
                top:          offset,
                left:         offset,
                width:        CIRCLE,
                height:       CIRCLE,
                borderRadius: '50%',
                overflow:     'hidden',
                pointerEvents:'none',
              }}
            >
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
                  userSelect:   'none',
                  pointerEvents:'none',
                }}
              />
            </div>

            {/*
             * NEON GLOW RING
             * Three layers: blurred outer halo → semi-transparent mid ring → crisp edge.
             * overflow:visible so the glow isn't clipped by the stage box.
             */}
            <svg
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
              width={STAGE}
              height={STAGE}
            >
              <defs>
                <filter id="icm-glow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur" />
                </filter>
              </defs>

              {/* Outer diffuse halo */}
              <circle
                cx={STAGE / 2} cy={STAGE / 2} r={CIRCLE / 2}
                fill="none"
                stroke="#4ade80"
                strokeWidth="24"
                opacity="0.28"
                filter="url(#icm-glow)"
              />

              {/* Mid glow ring */}
              <circle
                cx={STAGE / 2} cy={STAGE / 2} r={CIRCLE / 2}
                fill="none"
                stroke="#4ade80"
                strokeWidth="12"
                opacity="0.45"
                filter="url(#icm-glow)"
              />

              {/* Crisp bright edge ring */}
              <circle
                cx={STAGE / 2} cy={STAGE / 2} r={CIRCLE / 2}
                fill="none"
                stroke="#4ade80"
                strokeWidth="2.5"
                opacity="0.95"
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