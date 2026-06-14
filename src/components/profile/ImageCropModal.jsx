import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Check, X } from 'lucide-react';

const OUTPUT = 260;   // final canvas size
const STAGE = 340;    // drag area size (larger than circle so you can drag freely)
const CIRCLE = 240;   // visible circle diameter
const MIN_SCALE = 1;
const MAX_SCALE = 4;

export default function ImageCropModal({ open, onOpenChange, imageSrc, onConfirm }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: CIRCLE, h: CIRCLE });

  const scaleRef = useRef(1);
  const posRef = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragOrigin = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef(null);

  useEffect(() => {
    if (imageSrc && open) {
      setScale(1);
      setPos({ x: 0, y: 0 });
      scaleRef.current = 1;
      posRef.current = { x: 0, y: 0 };
      const img = new Image();
      img.onload = () => {
        const aspect = img.naturalWidth / img.naturalHeight;
        let baseW, baseH;
        if (aspect >= 1) { baseH = CIRCLE; baseW = CIRCLE * aspect; }
        else { baseW = CIRCLE; baseH = CIRCLE / aspect; }
        setNaturalSize({ w: baseW, h: baseH });
      };
      img.src = imageSrc;
    }
  }, [imageSrc, open]);

  const clampPos = (x, y, s) => {
    const w = naturalSize.w * s;
    const h = naturalSize.h * s;
    const maxX = w / 2 - CIRCLE / 2;
    const maxY = h / 2 - CIRCLE / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    isDragging.current = true;
    dragOrigin.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const rawX = e.clientX - dragOrigin.current.x;
    const rawY = e.clientY - dragOrigin.current.y;
    const clamped = clampPos(rawX, rawY, scaleRef.current);
    posRef.current = clamped;
    setPos(clamped);
  };

  const onPointerUp = () => { isDragging.current = false; };

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
    if (e.touches.length === 2 && lastPinchDist.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const delta = (dist - lastPinchDist.current) / 150;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scaleRef.current + delta));
      scaleRef.current = newScale;
      const clamped = clampPos(posRef.current.x, posRef.current.y, newScale);
      posRef.current = clamped;
      setScale(newScale);
      setPos(clamped);
      lastPinchDist.current = dist;
    }
  };

  const onTouchEnd = (e) => {
    if (e.touches.length < 2) lastPinchDist.current = null;
  };

  const changeScale = (delta) => {
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scaleRef.current + delta));
    scaleRef.current = newScale;
    const clamped = clampPos(posRef.current.x, posRef.current.y, newScale);
    posRef.current = clamped;
    setScale(newScale);
    setPos(clamped);
  };

  const handleConfirm = () => {
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.arc(OUTPUT / 2, OUTPUT / 2, OUTPUT / 2, 0, Math.PI * 2);
    ctx.clip();

    const img = new Image();
    img.onload = () => {
      const aspect = img.naturalWidth / img.naturalHeight;
      let baseW, baseH;
      if (aspect >= 1) { baseH = CIRCLE; baseW = CIRCLE * aspect; }
      else { baseW = CIRCLE; baseH = CIRCLE / aspect; }

      // Scale the base sizes to OUTPUT resolution
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
      <DialogContent className="rounded-3xl max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="font-nunito">Crop Photo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <p className="text-xs text-muted-foreground text-center">Drag to reposition · pinch or use buttons to zoom</p>

          {/* Outer drag zone — larger than the visible circle so dragging near edges works */}
          <div
            className="relative select-none touch-none"
            style={{ width: STAGE, height: STAGE, cursor: isDragging.current ? 'grabbing' : 'grab' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* The image — free to move anywhere within the stage */}
            <img
              src={imageSrc}
              alt="crop preview"
              draggable={false}
              style={{
                position: 'absolute',
                width: naturalSize.w * scale,
                height: naturalSize.h * scale,
                top: '50%',
                left: '50%',
                transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                objectFit: 'cover',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />

            {/* Overlay: dims everything outside the circle */}
            <svg
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
              width={STAGE}
              height={STAGE}
            >
              <defs>
                <mask id="hole">
                  <rect width={STAGE} height={STAGE} fill="white" />
                  <circle cx={STAGE / 2} cy={STAGE / 2} r={CIRCLE / 2} fill="black" />
                </mask>
              </defs>
              {/* Dark scrim outside circle */}
              <rect width={STAGE} height={STAGE} fill="rgba(0,0,0,0.55)" mask="url(#hole)" />
              {/* Circle border */}
              <circle cx={STAGE / 2} cy={STAGE / 2} r={CIRCLE / 2} fill="none" stroke="hsl(var(--primary))" strokeWidth="3" />
            </svg>
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