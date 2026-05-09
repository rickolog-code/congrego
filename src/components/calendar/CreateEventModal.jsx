import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCircle } from '@/lib/useCircleContext.jsx';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function CreateEventModal({ open, onOpenChange, selectedDate }) {
  const { user, activeCircleId, myMembership } = useCircle();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !selectedDate) return;
    setLoading(true);

    const eventDate = format(selectedDate, 'yyyy-MM-dd');
    const authorName = myMembership?.username || user.full_name || user.email.split('@')[0];

    // Create calendar event
    const calEvent = await base44.entities.CalendarEvent.create({
      circle_id: activeCircleId,
      title: title.trim(),
      description: description.trim(),
      event_date: eventDate,
      event_time: time,
      location: location.trim(),
      creator_email: user.email,
      creator_name: authorName,
    });

    // Auto-generate event post
    const postContent = `📅 **${title.trim()}**\n${format(selectedDate, 'EEEE, MMMM d')}${time ? ` at ${time}` : ''}${location ? `\n📍 ${location}` : ''}${description ? `\n\n${description}` : ''}`;

    await base44.entities.Post.create({
      circle_id: activeCircleId,
      author_email: user.email,
      author_name: authorName,
      author_image: myMembership?.profile_image || '',
      content: postContent,
      post_type: 'calendar_event',
      event_id: calEvent.id,
      upvotes: [],
      downvotes: [],
    });

    queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    queryClient.invalidateQueries({ queryKey: ['circle-posts'] });
    setTitle('');
    setDescription('');
    setTime('');
    setLocation('');
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="font-nunito">
            New Event — {selectedDate ? format(selectedDate, 'MMM d') : ''}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Event title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl"
          />
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-xl"
          />
          <Input
            placeholder="Time (e.g. 7:00 PM)"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-xl"
          />
          <Input
            placeholder="Location (optional)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="rounded-xl"
          />
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || loading}
            className="w-full rounded-xl h-11"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Event'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}