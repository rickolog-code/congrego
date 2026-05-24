import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const THEME_COLORS = [
  { label: 'Red',    hex: '#EF4444' },
  { label: 'Orange', hex: '#F97316' },
  { label: 'Gold',   hex: '#EAB308' },
  { label: 'Yellow', hex: '#FDE047' },
  { label: 'Teal',   hex: '#14B8A6' },
  { label: 'Blue',   hex: '#3B82F6' },
  { label: 'Navy',   hex: '#1E3A8A' },
  { label: 'Purple', hex: '#A855F7' },
  { label: 'Pink',   hex: '#EC4899' },
  { label: 'Brown',  hex: '#92400E' },
  { label: 'Grey',   hex: '#6B7280' },
  { label: 'Black',  hex: '#1F2937' },
];

export function randomThemeColor() {
  return THEME_COLORS[Math.floor(Math.random() * THEME_COLORS.length)].hex;
}

export default function ColorPickerModal({ open, onOpenChange, currentColor, onSelect }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-xs mx-auto">
        <DialogHeader>
          <DialogTitle className="font-nunito">Choose Your Color</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-3 pt-1">
          {THEME_COLORS.map(({ label, hex }) => (
            <button
              key={hex}
              onClick={() => { onSelect(hex); onOpenChange(false); }}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div
                className={`w-12 h-12 rounded-full transition-transform group-hover:scale-110 ${
                  currentColor === hex ? 'ring-4 ring-offset-2 ring-offset-background scale-110' : ''
                }`}
                style={{ background: hex, ringColor: hex }}
              />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}