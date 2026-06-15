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

export function randomThemeColor(takenColors = []) {
  const available = THEME_COLORS.filter(c => !takenColors.includes(c.hex));
  const pool = available.length > 0 ? available : THEME_COLORS;
  return pool[Math.floor(Math.random() * pool.length)].hex;
}

// takenColors: hex strings already chosen by OTHER members in this circle
export default function ColorPickerModal({ open, onOpenChange, currentColor, onSelect, takenColors = [] }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-xs mx-auto">
        <DialogHeader>
          <DialogTitle className="font-nunito">Choose Your Color</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-3 pt-1">
          {THEME_COLORS.map(({ label, hex }) => {
            const isTaken = takenColors.includes(hex);
            const isMine = currentColor === hex;
            return (
              <button
                key={hex}
                onClick={() => { if (!isTaken) { onSelect(hex); onOpenChange(false); } }}
                className="flex flex-col items-center gap-1.5 group"
                disabled={isTaken}
              >
                <div className="relative">
                  <div
                    className={`w-12 h-12 rounded-full transition-transform ${
                      isMine ? 'ring-4 ring-offset-2 ring-offset-background scale-110' : ''
                    } ${!isTaken ? 'group-hover:scale-110' : 'opacity-50'}`}
                    style={{ background: hex }}
                  />
                  {isTaken && (
                    <div
                      className="absolute inset-0 flex items-center justify-center rounded-full"
                      style={{
                        background: 'radial-gradient(circle, rgba(220,38,38,0.25) 0%, transparent 70%)',
                        filter: 'drop-shadow(0 0 6px rgba(220,38,38,0.9))',
                      }}
                    >
                      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="2.5" fill="rgba(220,38,38,0.15)" />
                        <line x1="4" y1="20" x2="20" y2="4" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
                        <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="1" fill="none"
                          style={{ filter: 'blur(2px)', opacity: 0.6 }} />
                      </svg>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}