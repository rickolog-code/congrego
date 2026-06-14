import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { Loader2, Upload } from 'lucide-react';
import ImageCropModal from './ImageCropModal';

// Default avatar images
const DEFAULT_AVATARS = [
  { id: 'sloth',   label: 'Sloth',   url: 'https://media.base44.com/images/public/69ff930a3528037ceadeeade/1ce7d8bef_image.png' },
  { id: 'compass', label: 'Compass', url: 'https://media.base44.com/images/public/69ff930a3528037ceadeeade/770a89e5d_image.png' },
  { id: 'fire',    label: 'Fire',    url: 'https://media.base44.com/images/public/69ff930a3528037ceadeeade/ec4814a13_image.png' },
  { id: 'mask',    label: 'Mask',    url: 'https://media.base44.com/images/public/69ff930a3528037ceadeeade/8db74d071_image.png' },
  { id: 'frog',    label: 'Frog',    url: 'https://media.base44.com/images/public/69ff930a3528037ceadeeade/8234c9054_image.png' },
  { id: 'leaf',    label: 'Leaf',    url: 'https://media.base44.com/images/public/69ff930a3528037ceadeeade/3265e4836_image.png' },
];

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
      onOpenChange(false); // close picker before opening crop
      setShowCrop(true);
    };
    reader.readAsDataURL(file);
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
    onSelect(avatar.url);
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
              {DEFAULT_AVATARS.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => handleSelectDefault(avatar)}
                  className="flex flex-col items-center gap-1 p-2 rounded-2xl border-2 border-transparent hover:border-primary transition-all"
                >
                  <img src={avatar.url} alt={avatar.label} className="w-14 h-14 rounded-2xl object-cover" />
                  <span className="text-[10px] text-muted-foreground font-medium">{avatar.label}</span>
                </button>
              ))}
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