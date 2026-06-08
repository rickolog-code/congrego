import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCircle } from '@/lib/useCircleContext.jsx';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import TimePicker from './TimePicker';
import DateRangePicker from './DateRangePicker';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function RecurringBusyModal({ open, onOpenChange }) {
  const { user, activeCircleId, myMembership } = useCircle();
  const queryClient = useQueryClient();

  const [view, setView] = useState('main'); // 'main' | 'datepicker'
  const [selectedDays, setSelectedDays] = useState([]);
  const [allDay, setAllDay] = useState(true);
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [untilMode, setUntilMode] = useState('forever');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: existingRecurring = [] } = useQuery({
    queryKey: ['calendar-events', activeCircleId],
    queryFn: () => base44.entities.CalendarEvent.filter({ circle_id: activeCircleId }),
    enabled: !!activeCircleId && open,
    select: (data) => data.filter(e => e.event_type === 'recurring_busy' && e.creator_email === user?.email),
  });

  useEffect(() => {
    if (open && existingRecurring.length > 0) {
      const e = existingRecurring[0];
      setSelectedDays(e.busy_days_of_week || []);
      setAllDay(e.busy_all_day !== false);
      setTimeStart(e.busy_time_start || '');
      setTimeEnd(e.busy_time_end || '');
      setUntilMode(e.busy_until || 'forever');
      if (e.busy_start_date) setStartDate(new Date(e.busy_start_date + 'T00:00:00'));
      if (e.busy_end_date) setEndDate(new Date(e.busy_end_date + 'T00:00:00'));
    }
  }, [open, existingRecurring.length]);

  // Reset view when modal closes
  useEffect(() => { if (!open) setView('main'); }, [open]);

  const toggleDay = (idx) => {
    setSelectedDays(prev =>
      prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]
    );
  };

  const handleConfirm = async () => {
    if (selectedDays.length === 0) return;
    setLoading(true);
    const authorName = myMembership?.username || user.full_name || user.email.split('@')[0];
    const payload = {
      circle_id: activeCircleId,
      title: `[busy] ${authorName}`,
      event_date: format(new Date(), 'yyyy-MM-dd'),
      creator_email: user.email,
      creator_name: authorName,
      event_type: 'recurring_busy',
      busy_days_of_week: selectedDays,
      busy_all_day: allDay,
      busy_time_start: allDay ? '' : timeStart,
      busy_time_end: allDay ? '' : timeEnd,
      busy_until: untilMode,
      busy_start_date: startDate ? format(startDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      busy_end_date: untilMode === 'date' && endDate ? format(endDate, 'yyyy-MM-dd') : null,
    };
    await Promise.all(existingRecurring.map(e => base44.entities.CalendarEvent.delete(e.id)));
    await base44.entities.CalendarEvent.create(payload);
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    setLoading(false);
    onOpenChange(false);
  };

  const handleClear = async () => {
    setLoading(true);
    await Promise.all(existingRecurring.map(e => base44.entities.CalendarEvent.delete(e.id)));
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    setSelectedDays([]);
    setStartDate(null);
    setEndDate(null);
    setUntilMode('forever');
    setLoading(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="rounded-3xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="font-extrabold">🔄 Recurring Busy Time</DialogTitle>
          </DialogHeader>

          {view === 'main' ? (
            <div className="space-y-5">
              {/* Day selector — taller buttons */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Select days you're busy</p>
                <div className="flex gap-1.5 justify-between">
                  {DAYS.map((label, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleDay(idx)}
                      className={`flex-1 py-4 rounded-xl text-xs font-bold transition-all ${
                        selectedDays.includes(idx)
                          ? 'bg-red-500 text-white'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* All day / timeframe */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Time</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAllDay(true)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                      allDay ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                    }`}
                  >
                    All day
                  </button>
                  <button
                    onClick={() => setAllDay(false)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                      !allDay ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                    }`}
                  >
                    Select time
                  </button>
                </div>
                {!allDay && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setShowStartPicker(true)}
                      className="flex-1 py-2 rounded-xl text-xs border border-input bg-muted text-center font-medium"
                    >
                      {timeStart || 'From'}
                    </button>
                    <button
                      onClick={() => setShowEndPicker(true)}
                      className="flex-1 py-2 rounded-xl text-xs border border-input bg-muted text-center font-medium"
                    >
                      {timeEnd || 'To'}
                    </button>
                  </div>
                )}
              </div>

              {/* Duration */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">How long?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setUntilMode('forever')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                      untilMode === 'forever' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                    }`}
                  >
                    Until I turn it off
                  </button>
                  <button
                    onClick={() => { setUntilMode('date'); setView('datepicker'); }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                      untilMode === 'date' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                    }`}
                  >
                    {startDate && endDate
                      ? `${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d')}`
                      : 'Select dates'}
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={handleClear}
                  disabled={loading || existingRecurring.length === 0}
                  className="flex-1 rounded-xl border-red-300 text-red-500 hover:bg-red-50"
                >
                  Clear
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={loading || selectedDays.length === 0}
                  className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
                </Button>
              </div>
            </div>
          ) : (
            /* Inline date range picker — no second dialog */
            <DateRangePicker
              label="Select date range for recurring busy"
              onConfirm={(s, e) => { setStartDate(s); setEndDate(e); setView('main'); }}
              onCancel={() => setView('main')}
            />
          )}
        </DialogContent>
      </Dialog>

      <TimePicker open={showStartPicker} onOpenChange={setShowStartPicker} onConfirm={(t) => setTimeStart(t)} />
      <TimePicker open={showEndPicker} onOpenChange={setShowEndPicker} onConfirm={(t) => setTimeEnd(t)} />
    </>
  );
}