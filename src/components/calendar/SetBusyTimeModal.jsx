import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCircle } from '@/lib/useCircleContext.jsx';
import { useQueryClient } from '@tanstack/react-query';
import { format, eachDayOfInterval } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import TimePicker from './TimePicker';

export default function SetBusyTimeModal({ open, onOpenChange, onRequestDatePick }) {
  const { user, activeCircleId, myMembership } = useCircle();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState('single');
  const [singleDate, setSingleDate] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [allDay, setAllDay] = useState(true);
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [busyTitle, setBusyTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setMode('single'); setSingleDate(null); setStartDate(null); setEndDate(null);
    setAllDay(true); setTimeStart(''); setTimeEnd(''); setBusyTitle('');
  };

  const handleSelectDate = async () => {
    onOpenChange(false);
    const result = await onRequestDatePick({ singleMode: mode === 'single', for: 'busy' });
    onOpenChange(true);
    if (result) {
      if (mode === 'single') setSingleDate(result.start);
      else { setStartDate(result.start); setEndDate(result.end); }
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    const authorName = myMembership?.username || user.full_name || user.email.split('@')[0];

    if (mode === 'single' && singleDate) {
      await base44.entities.CalendarEvent.create({
        circle_id: activeCircleId,
        title: busyTitle.trim() ? busyTitle.trim() : `[busy] ${authorName}`,
        event_date: format(singleDate, 'yyyy-MM-dd'),
        creator_email: user.email,
        creator_name: authorName,
        event_type: 'busy',
        busy_start_date: format(singleDate, 'yyyy-MM-dd'),
        busy_end_date: format(singleDate, 'yyyy-MM-dd'),
        busy_all_day: allDay,
        busy_time_start: allDay ? '' : timeStart,
        busy_time_end: allDay ? '' : timeEnd,
      });
    } else if (mode === 'multi' && startDate && endDate) {
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      await Promise.all(days.map(day =>
        base44.entities.CalendarEvent.create({
          circle_id: activeCircleId,
          title: busyTitle.trim() ? busyTitle.trim() : `[busy] ${authorName}`,
          event_date: format(day, 'yyyy-MM-dd'),
          creator_email: user.email,
          creator_name: authorName,
          event_type: 'busy',
          busy_start_date: format(startDate, 'yyyy-MM-dd'),
          busy_end_date: format(endDate, 'yyyy-MM-dd'),
          busy_all_day: allDay,
          busy_time_start: allDay ? '' : timeStart,
          busy_time_end: allDay ? '' : timeEnd,
        })
      ));
    }

    queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    setLoading(false);
    reset();
    onOpenChange(false);
  };

  const canConfirm = mode === 'single' ? !!singleDate : (!!startDate && !!endDate);

  const dateLabel = mode === 'single'
    ? (singleDate ? format(singleDate, 'EEEE, MMMM d') : 'Select date')
    : (startDate && endDate ? `${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d')}` : 'Select start & end date');

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
        <DialogContent className="rounded-3xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="font-extrabold">📅 Set Busy Time</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Single / Multi */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Duration</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('single')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border-2 ${mode === 'single' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                >
                  Single day
                </button>
                <button
                  onClick={() => setMode('multi')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border-2 ${mode === 'multi' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                >
                  Multiple days
                </button>
              </div>
            </div>

            {/* Date button — opens overlay */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                {mode === 'single' ? 'Date' : 'Date range'}
              </p>
              <button
                onClick={handleSelectDate}
                className="w-full py-2.5 rounded-xl border border-input bg-muted text-sm font-medium text-center"
              >
                {dateLabel}
              </button>
            </div>

            {/* Optional title */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Title <span className="font-normal">(optional)</span></p>
              <Input
                value={busyTitle}
                onChange={(e) => setBusyTitle(e.target.value)}
                placeholder='e.g. "Work", "Travel"'
                className="rounded-xl text-sm"
              />
            </div>

            {/* All day / time */}
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

            <Button
              onClick={handleConfirm}
              disabled={loading || !canConfirm}
              className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white h-11"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <TimePicker open={showStartPicker} onOpenChange={setShowStartPicker} onConfirm={(t) => setTimeStart(t)} />
      <TimePicker open={showEndPicker} onOpenChange={setShowEndPicker} onConfirm={(t) => setTimeEnd(t)} />
    </>
  );
}