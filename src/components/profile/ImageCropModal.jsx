import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Check, X } from 'lucide-react';

export default function ImageCropModal({ open, onOpenChange, imageSrc, onConfirm }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const canvasRef = useRef(null);
  const SIZE = 260; // circle diameter in px

  // Reset when a new image is loaded
  useEffect(() => {
    if (imageSrc && open) {
      setScale(1);
      setPos({ x: 0, y: 0 });
    }
  }, [imageSrc, open]);

  const clampPos = useCallback((x, y, s) => {
    // Half the image size at current scale
    const halfW = (SIZE * s) / 2;
    const halfH = (SIZE * s) / 2;
    const maxOff = halfW - SIZE / 2;
    return {
      x: Math.max(-maxOff, Math.min(maxOff, x)),
      y: Math.max(-maxOff, Math.min(maxOff, y)),
    };
  }, []);

  const onPointerDown = (e) => {
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };

  const onPointerMove = useCallback((e) => {
    if (!dragging || !dragStart.current) return;
    const rawX = e.clientX - dragStart.current.x;
    const rawY = e.clientY - dragStart.current.y;
    setPos(clampPos(rawX, rawY, scale));
  }, [dragging, scale, clampPos]);

  const onPointerUp = () => {
    setDragging(false);
    dragStart.current = null;
  };

  const changeScale = (delta) => {
    const newScale = Math.max(1, Math.min(4, scale + delta));
    setScale(newScale);
    setPos((p) => clampPos(p.x, p.y, newScale));
  };

  const handleConfirm = () => {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');

    // Clip to circle
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const drawSize = SIZE * scale;
      const drawX = (SIZE - drawSize) / 2 + pos.x;
      const drawY = (SIZE - drawSize) / 2 + pos.y;
      ctx.drawImage(img, drawX, drawY, drawSize, drawSize);
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
          <p className="text-xs text-muted-foreground text-center">Drag to reposition · Use buttons to zoom</p>

          {/* Circle crop area */}
          <div
            className="relative overflow-hidden rounded-full border-4 border-primary shadow-lg cursor-grab active:cursor-grabbing select-none"
            style={{ width: SIZE, height: SIZE }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            <img
              src={imageSrc}
              alt="crop"
              draggable={false}
              style={{
                position: 'absolute',
                width: SIZE * scale,
                height: SIZE * scale,
                top: '50%',
                left: '50%',
                transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => changeScale(-0.25)} disabled={scale <= 1}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold w-12 text-center">{Math.round(scale * 100)}%</span>
            <Button variant="outline" size="icon" onClick={() => changeScale(0.25)} disabled={scale >= 4}>
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