import { useState } from 'react';
import { randomThemeColor } from '@/components/profile/ColorPickerModal';
import { base44 } from '@/api/base44Client';
import { useCircle } from '@/lib/useCircleContext.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Palette } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const jungleColors = ['#2D6A4F', '#40916C', '#52B788', '#74C69D', '#95D5B2', '#1B4332', '#B7E4C7'];

const jungleIcons = ['🦎', '🌿', '🌴', '🏛️', '🌺', '🌊', '🐒'];

export default function CreateCircleModal({ open, onOpenChange }) {
  const { user, circles, refreshCircles, isLoadingCircles } = useCircle();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [color, setColor] = useState(jungleColors[0]);
  const [icon, setIcon] = useState(jungleIcons[0]);
  const [loading, setLoading] = useState(false);

  const atLimit = !isLoadingCircles && circles.length >= 5;

  const handleCreate = async () => {
    if (!name.trim() || !user?.email || atLimit) return;
    setLoading(true);
    try {
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      const circle = await base44.entities.Circle.create({
        name: name.trim(),
        color,
        host_email: user.email,
        invite_code: inviteCode,
        invite_expires_at: expiresAt,
        member_count: 1,
      });

      await base44.entities.CircleMember.create({
        circle_id: circle.id,
        user_email: user.email,
        username: user.full_name || user.email.split('@')[0],
        profile_image: '',
        role: 'host',
        availability: 'unset',
        theme_color: randomThemeColor(),
      });

      refreshCircles();
      queryClient.invalidateQueries({ queryKey: ['circle-members'] });
      setName('');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="font-nunito text-lg">Create a Circle</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {atLimit && (
            <p className="text-sm text-destructive font-medium text-center">
              You've reached the 5 circle limit. Leave a circle to create a new one.
            </p>
          )}
          <Input
            placeholder="Circle name..."
            disabled={atLimit}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl text-base"
          />

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Palette className="w-3 h-3" /> Theme Color
            </p>
            <div className="flex gap-2">
              {jungleColors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    color === c ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110' : ''
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Circle Icon</p>
            <div className="flex gap-2">
              {jungleIcons.map((i) => (
                <button
                  key={i}
                  onClick={() => setIcon(i)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all ${
                    icon === i ? 'bg-primary/10 ring-2 ring-primary scale-110' : 'bg-muted'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={!name.trim() || loading || atLimit}
            className="w-full rounded-xl h-11"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Circle'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}