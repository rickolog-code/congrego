import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function ManageSyncedCalendarsModal({ open, onOpenChange, user, myMembership }) {
  const { toast } = useToast();

  const hasGoogle = myMembership?.calendar_provider === 'google' && myMembership?.calendar_synced;
  const hasApple = myMembership?.calendar_provider === 'apple' && myMembership?.calendar_synced;

  const [googleCals, setGoogleCals] = useState([]);
  const [appleCals, setAppleCals] = useState([]);
  const [selectedGoogle, setSelectedGoogle] = useState([]);
  const [selectedApple, setSelectedApple] = useState([]);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const [saving, setSaving] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [appleError, setAppleError] = useState('');

  const fetchGoogleCals = async () => {
    setLoadingGoogle(true);
    setGoogleError('');
    const res = await base44.functions.invoke('discoverGoogleCalendars', {}).catch(e => ({ data: { error: e.message } }));
    if (res?.data?.calendars) {
      setGoogleCals(res.data.calendars);
    } else {
      setGoogleError(res?.data?.error || 'Failed to load Google calendars.');
    }
    setLoadingGoogle(false);
  };

  const fetchAppleCals = async () => {
    setLoadingApple(true);
    setAppleError('');
    const res = await base44.functions.invoke('discoverAppleCalendars', {}).catch(e => ({ data: { error: e.message } }));
    if (res?.data?.calendars) {
      setAppleCals(res.data.calendars);
    } else {
      setAppleError(res?.data?.error || 'Failed to load Apple calendars.');
    }
    setLoadingApple(false);
  };

  // Load saved preferences and calendars on open
  useEffect(() => {
    if (!open || !user) return;
    // Load saved prefs from user
    base44.auth.me().then(u => {
      setSelectedGoogle(u.approvedGoogleCalendarIds || []);
      setSelectedApple(u.approvedAppleCalendarUrls || []);
    }).catch(() => {});

    if (hasGoogle) fetchGoogleCals();
    if (hasApple) fetchAppleCals();
  }, [open, user?.email]);

  const toggleGoogle = (id) => {
    setSelectedGoogle(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleApple = (url) => {
    setSelectedApple(prev => prev.includes(url) ? prev.filter(x => x !== url) : [...prev, url]);
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      approvedGoogleCalendarIds: selectedGoogle,
      approvedAppleCalendarUrls: selectedApple,
    });
    setSaving(false);
    toast({ description: 'Calendar preferences saved.' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-sm mx-auto max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-extrabold">Manage Synced Calendars</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pb-2">
          {!hasGoogle && !hasApple && (
            <p className="text-sm text-muted-foreground text-center py-4">
              You haven't connected any calendar yet. Use "Calendar Sync" in Settings to connect one first.
            </p>
          )}

          {/* Google */}
          {hasGoogle && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold flex items-center gap-2">
                  <span className="text-base">🗓</span> Google Calendar
                </p>
                <button onClick={fetchGoogleCals} disabled={loadingGoogle} className="text-muted-foreground hover:text-foreground transition-colors">
                  <RefreshCw className={`w-4 h-4 ${loadingGoogle ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {loadingGoogle ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : googleError ? (
                <p className="text-xs text-destructive">{googleError}</p>
              ) : googleCals.length === 0 ? (
                <p className="text-xs text-muted-foreground">No calendars found.</p>
              ) : (
                <div className="space-y-2">
                  {googleCals.map(cal => {
                    const checked = selectedGoogle.includes(cal.id);
                    return (
                      <button
                        key={cal.id}
                        onClick={() => toggleGoogle(cal.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                          checked ? 'border-primary bg-primary/5' : 'border-border bg-muted/40'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: cal.backgroundColor }} />
                        <span className="text-sm font-medium flex-1 truncate">{cal.summary}</span>
                        {checked && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Apple */}
          {hasApple && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold flex items-center gap-2">
                  <span className="text-base">🍎</span> Apple Calendar
                </p>
                <button onClick={fetchAppleCals} disabled={loadingApple} className="text-muted-foreground hover:text-foreground transition-colors">
                  <RefreshCw className={`w-4 h-4 ${loadingApple ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {loadingApple ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : appleError ? (
                <p className="text-xs text-destructive">{appleError}</p>
              ) : appleCals.length === 0 ? (
                <p className="text-xs text-muted-foreground">No calendars found.</p>
              ) : (
                <div className="space-y-2">
                  {appleCals.map(cal => {
                    const checked = selectedApple.includes(cal.url);
                    return (
                      <button
                        key={cal.url}
                        onClick={() => toggleApple(cal.url)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                          checked ? 'border-primary bg-primary/5' : 'border-border bg-muted/40'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full flex-shrink-0 bg-gray-400" />
                        <span className="text-sm font-medium flex-1 truncate">{cal.displayname}</span>
                        {checked && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {(hasGoogle || hasApple) && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-xl h-11"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Preferences'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}