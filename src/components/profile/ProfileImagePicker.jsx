import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { Loader2, Upload } from 'lucide-react';
import ImageCropModal from './ImageCropModal';

// Default avatar SVGs - minimalistic nature/jungle themed
const DEFAULT_AVATARS = [
  {
    id: 'tree',
    label: 'Tree',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="44" y="60" width="12" height="30" fill="#8B6914" rx="3"/>
      <ellipse cx="50" cy="42" rx="28" ry="30" fill="#2D6A4F"/>
      <ellipse cx="50" cy="30" rx="20" ry="22" fill="#40916C"/>
    </svg>`,
  },
  {
    id: 'branch',
    label: 'Branch',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 80 Q45 55 60 35" stroke="#8B6914" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M60 35 Q70 20 80 15" stroke="#8B6914" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M60 35 Q75 40 85 30" stroke="#8B6914" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse cx="80" cy="15" rx="8" ry="12" fill="#52B788" transform="rotate(-20,80,15)"/>
      <ellipse cx="85" cy="30" rx="8" ry="11" fill="#52B788" transform="rotate(20,85,30)"/>
      <ellipse cx="45" cy="50" rx="7" ry="10" fill="#52B788" transform="rotate(-40,45,50)"/>
    </svg>`,
  },
  {
    id: 'monkey',
    label: 'Monkey',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="52" r="26" fill="#8B6914"/>
      <ellipse cx="28" cy="46" rx="10" ry="12" fill="#A07820"/>
      <ellipse cx="72" cy="46" rx="10" ry="12" fill="#A07820"/>
      <ellipse cx="50" cy="62" rx="16" ry="12" fill="#C9956C"/>
      <circle cx="44" cy="46" r="5" fill="#2D1A00"/>
      <circle cx="56" cy="46" r="5" fill="#2D1A00"/>
      <circle cx="45" cy="45" r="2" fill="white"/>
      <circle cx="57" cy="45" r="2" fill="white"/>
      <ellipse cx="47" cy="58" rx="4" ry="3" fill="#8B4513"/>
      <ellipse cx="53" cy="58" rx="4" ry="3" fill="#8B4513"/>
    </svg>`,
  },
  {
    id: 'rock',
    label: 'Rock',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="62" rx="36" ry="24" fill="#6B7280"/>
      <ellipse cx="50" cy="56" rx="36" ry="28" fill="#9CA3AF"/>
      <ellipse cx="42" cy="46" rx="14" ry="16" fill="#D1D5DB"/>
    </svg>`,
  },
  {
    id: 'stonehead',
    label: '🗿 Stone',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="30" y="70" width="40" height="20" rx="4" fill="#6B6350"/>
      <ellipse cx="50" cy="52" rx="26" ry="34" fill="#8B7D6B"/>
      <rect x="32" y="46" width="36" height="20" rx="2" fill="#8B7D6B"/>
      <rect x="34" y="44" width="32" height="6" fill="#7A6D5E"/>
      <rect x="36" y="56" width="12" height="6" rx="2" fill="#5A4E40"/>
      <rect x="52" y="56" width="12" height="6" rx="2" fill="#5A4E40"/>
      <rect x="38" y="65" width="24" height="5" rx="2" fill="#5A4E40"/>
    </svg>`,
  },
  {
    id: 'river',
    label: 'River',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="100" height="100" rx="50" fill="#BFDBFE"/>
      <path d="M10 55 Q25 42 40 55 Q55 68 70 55 Q85 42 90 50" stroke="#3B82F6" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M10 68 Q25 55 40 68 Q55 81 70 68 Q85 55 90 63" stroke="#2563EB" stroke-width="4" fill="none" stroke-linecap="round"/>
      <ellipse cx="30" cy="35" rx="18" ry="12" fill="#34D399" opacity="0.6"/>
      <ellipse cx="70" cy="30" rx="14" ry="10" fill="#34D399" opacity="0.6"/>
    </svg>`,
  },
];

function svgToDataUrl(svgStr) {
  const encoded = encodeURIComponent(svgStr.trim());
  return `data:image/svg+xml,${encoded}`;
}

export default function ProfileImagePicker({ open, onOpenChange, onSelect, currentImage }) {
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [showCrop, setShowCrop] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropSrc(ev.target.result);
      setShowCrop(true);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleCropConfirm = async (blob) => {
    setUploading(true);
    const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploading(false);
    onSelect(file_url);
    onOpenChange(false);
  };

  const handleSelectDefault = (avatar) => {
    const dataUrl = svgToDataUrl(avatar.svg);
    onSelect(dataUrl);
    onOpenChange(false);
  };

  return (
    <>
      <ImageCropModal
        open={showCrop}
        onOpenChange={setShowCrop}
        imageSrc={cropSrc}
        onConfirm={handleCropConfirm}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="rounded-3xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="font-nunito">Choose Profile Picture</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-xs text-muted-foreground font-semibold">Default Avatars</p>
            <div className="grid grid-cols-3 gap-3">
              {DEFAULT_AVATARS.map((avatar) => {
                const url = svgToDataUrl(avatar.svg);
                return (
                  <button
                    key={avatar.id}
                    onClick={() => handleSelectDefault(avatar)}
                    className="flex flex-col items-center gap-1 p-2 rounded-2xl border-2 border-transparent hover:border-primary transition-all"
                  >
                    <img src={url} alt={avatar.label} className="w-14 h-14 rounded-2xl" />
                    <span className="text-[10px] text-muted-foreground font-medium">{avatar.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-border pt-3">
              <label className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-border hover:border-primary cursor-pointer transition-colors bg-muted/30">
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium text-muted-foreground">
                  {uploading ? 'Uploading...' : 'Upload from camera roll'}
                </span>
                <Input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}