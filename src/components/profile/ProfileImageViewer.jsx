import { Dialog, DialogContent } from '@/components/ui/dialog';

export default function ProfileImageViewer({ open, onOpenChange, imageUrl, name }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-xs mx-auto flex flex-col items-center gap-4 p-6">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-48 h-48 rounded-3xl object-cover" />
        ) : (
          <div className="w-48 h-48 rounded-3xl bg-primary/10 flex items-center justify-center">
            <span className="text-6xl font-bold text-primary">{name?.[0]?.toUpperCase()}</span>
          </div>
        )}
        <p className="font-bold text-base">{name}</p>
      </DialogContent>
    </Dialog>
  );
}