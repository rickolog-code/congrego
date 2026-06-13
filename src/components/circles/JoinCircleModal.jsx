import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { randomThemeColor } from '@/components/profile/ColorPickerModal';
import { base44 } from '@/api/base44Client';
import { useCircle } from '@/lib/useCircleContext.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function JoinCircleModal({ open, onOpenChange }) {
  const { user, circles, refreshCircles, switchCircle, isLoadingCircles } = useCircle();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const atLimit = !isLoadingCircles && circles.length >= 5;

  const handleJoin = async () => {
    if (!code.trim() || atLimit) return;
    setLoading(true);
    setError('');

    const circles = await base44.entities.Circle.filter({ invite_code: code.trim().toUpperCase() });

    if (circles.length === 0) {
      setError('Invalid invite code.');
      setLoading(false);
      return;
    }

    const circle = circles[0];

    if (new Date(circle.invite_expires_at) < new Date()) {
      setError('This invite code has expired.');
      setLoading(false);
      return;
    }

    const existing = await base44.entities.CircleMember.filter({
      circle_id: circle.id,
      user_email: user.email,
    });

    if (existing.length > 0) {
      setError('You are already in this circle.');
      setLoading(false);
      return;
    }

    await base44.entities.CircleMember.create({
      circle_id: circle.id,
      user_email: user.email,
      username: user.full_name || user.email.split('@')[0],
      role: 'member',
      availability: 'unset',
      theme_color: randomThemeColor(),
    });

    await base44.entities.Circle.update(circle.id, {
      member_count: (circle.member_count || 1) + 1,
    });

    // Keep circle_ids on the User in sync for RLS
    const currentUser = await base44.auth.me();
    const existingCircleIds = currentUser.circle_ids || [];
    await base44.auth.updateMe({
      circle_ids: [...new Set([...existingCircleIds, circle.id])],
    });

    // Immediately switch to the joined circle and navigate home — don't wait for refetch
    switchCircle(circle.id);
    refreshCircles();
    queryClient.invalidateQueries({ queryKey: ['circle-members'] });
    setLoading(false);
    setCode('');
    onOpenChange(false);
    navigate('/');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="font-nunito text-lg">Join a Circle</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {atLimit && (
            <p className="text-sm text-destructive font-medium text-center">
              You've reached the 5 circle limit. Leave a circle to join a new one.
            </p>
          )}
          <Input
            placeholder="Enter invite code..."
            disabled={atLimit}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="rounded-xl text-base text-center tracking-widest font-bold uppercase"
            maxLength={6}
          />
          {error && (
            <p className="text-destructive text-sm flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </p>
          )}
          <Button
            onClick={handleJoin}
            disabled={!code.trim() || loading || atLimit}
            className="w-full rounded-xl h-11"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join Circle'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}