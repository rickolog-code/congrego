import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import TimePicker from './TimePicker';

export default function EditBusyEventModal({ event, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [allDay, setAllDay] = useState(true);
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (event && open) {
      setAllDay(event.busy_all_day !== false);
      setTimeStart(event.busy_time_start || '');
      setTimeEnd(event.busy_time_end || '');
    }
  }, [event, open]);

  const handleSave = async () => {
    setLoading(true);
    await base44.entities.CalendarEvent.update(event.id, {
      busy_all_day: allDay,
      busy_time_start: allDay ? '' : timeStart,
      busy_time_end: allDay ? '' : timeEnd,
    });
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="rounded-3xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="font-extrabold">✏️ Edit Busy Time</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {event && (
              <p className="text-xs text-muted-foreground">
                {format(new Date(event.event_date + 'T00:00:00'), 'EEEE, MMMM d')}
              </p>
            )}

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Time</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setAllDay(true)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border-2 ${allDay ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                >
                  All day
                </button>
                <button
                  onClick={() => setAllDay(false)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border-2 ${!allDay ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                >
                  Select time
                </button>
              </div>
              {!allDay && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setShowStartPicker(true)} className="flex-1 py-2 rounded-xl text-xs border border-input bg-muted text-center font-medium">
                    {timeStart || 'From'}
                  </button>
                  <button onClick={() => setShowEndPicker(true)} className="flex-1 py-2 rounded-xl text-xs border border-input bg-muted text-center font-medium">
                    {timeEnd || 'To'}
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TimePicker open={showStartPicker} onOpenChange={setShowStartPicker} onConfirm={(t) => setTimeStart(t)} />
      <TimePicker open={showEndPicker} onOpenChange={setShowEndPicker} onConfirm={(t) => setTimeEnd(t)} />
    </>
  );
}