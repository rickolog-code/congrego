import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Check, X } from 'lucide-react';

const SIZE = 260;
const MIN_SCALE = 1;
const MAX_SCALE = 4;

export default function ImageCropModal({ open, onOpenChange, imageSrc, onConfirm }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });

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
    }
  }, [imageSrc, open]);

  const onPointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;
    dragOrigin.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const newX = e.clientX - dragOrigin.current.x;
    const newY = e.clientY - dragOrigin.current.y;
    posRef.current = { x: newX, y: newY };
    setPos({ x: newX, y: newY });
  };

  const onPointerUp = (e) => {
    isDragging.current = false;
  };

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
      setScale(newScale);
      lastPinchDist.current = dist;
    }
  };

  const onTouchEnd = (e) => {
    if (e.touches.length < 2) lastPinchDist.current = null;
  };

  const changeScale = (delta) => {
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scaleRef.current + delta));
    scaleRef.current = newScale;
    setScale(newScale);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="font-nunito">Crop Photo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <p className="text-xs text-muted-foreground text-center">Drag or pinch to adjust</p>

          {/* Crop circle — overflow-hidden clips the preview only, not the drag */}
          <div
            className="relative overflow-hidden rounded-full border-4 border-primary shadow-lg select-none touch-none"
            style={{ width: SIZE, height: SIZE, flexShrink: 0, cursor: isDragging.current ? 'grabbing' : 'grab' }}
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
              alt="crop preview"
              draggable={false}
              style={{
                position: 'absolute',
                width: SIZE * scale,
                height: SIZE * scale,
                top: '50%',
                left: '50%',
                transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                objectFit: 'cover',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
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