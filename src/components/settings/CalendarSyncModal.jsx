import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { Loader2, ExternalLink } from 'lucide-react';

const CALENDAR_CONNECTOR_ID = '6a134e97b8274a0809c582f7';

// Detect if an email looks like an Apple account
function isAppleEmail(email) {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return domain === 'icloud.com' || domain === 'me.com' || domain === 'mac.com';
}

export default function CalendarSyncModal({ open, onOpenChange, userEmail, onSyncComplete }) {
  const appleDetected = isAppleEmail(userEmail);

  // 'choose' | 'google' | 'apple'
  const [step, setStep] = useState(appleDetected ? 'apple' : 'google');
  const [appleId, setAppleId] = useState(userEmail || '');
  const [appPassword, setAppPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setStep(appleDetected ? 'apple' : 'google');
    setAppPassword('');
    setError('');
    setLoading(false);
  };

  const handleOpenChange = (v) => {
    if (!v) reset();
    onOpenChange(v);
  };

  // --- Google OAuth flow ---
  const handleGoogleSync = async () => {
    setLoading(true);
    setError('');
    const url = await base44.connectors.connectAppUser(CALENDAR_CONNECTOR_ID);
    const popup = window.open(url, '_blank');
    const timer = setInterval(async () => {
      if (!popup || popup.closed) {
        clearInterval(timer);
        await base44.functions.invoke('syncGoogleCalendars', {});
        setLoading(false);
        onSyncComplete('google');
        handleOpenChange(false);
      }
    }, 500);
  };

  // --- Apple CalDAV flow ---
  const handleAppleSync = async () => {
    if (!appleId.trim() || !appPassword.trim()) {
      setError('Please enter both your Apple ID and app-specific password.');
      return;
    }
    setLoading(true);
    setError('');
    const res = await base44.functions.invoke('syncAppleCalendar', {
      appleId: appleId.trim(),
      appPassword: appPassword.trim(),
    });
    setLoading(false);
    if (res.data?.error) {
      setError(res.data.error);
    } else {
      onSyncComplete('apple');
      handleOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-3xl max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="font-nunito">Sync Calendar</DialogTitle>
        </DialogHeader>

        {/* Provider chooser — shown when provider is ambiguous */}
        {step === 'choose' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Choose your calendar provider:</p>
            <Button className="w-full rounded-2xl justify-start gap-3 h-12" onClick={() => setStep('google')}>
              <img src="https://www.gstatic.com/images/branding/product/1x/googleg_16dp.png" alt="" className="w-4 h-4" />
              Google Calendar
            </Button>
            <Button variant="outline" className="w-full rounded-2xl justify-start gap-3 h-12" onClick={() => setStep('apple')}>
              <span className="text-base">🍎</span>
              Apple Calendar (iCloud)
            </Button>
          </div>
        )}

        {/* Google flow */}
        {step === 'google' && (
          <div className="space-y-4">
            {!appleDetected && (
              <button onClick={() => setStep('choose')} className="text-xs text-muted-foreground underline">
                ← Use Apple Calendar instead
              </button>
            )}
            <p className="text-sm text-muted-foreground">
              We'll open a Google sign-in window to securely connect your calendar.
            </p>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button className="w-full rounded-2xl h-12 font-bold" onClick={handleGoogleSync} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (
                <img src="https://www.gstatic.com/images/branding/product/1x/googleg_16dp.png" alt="" className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Syncing...' : 'Connect Google Calendar'}
            </Button>
          </div>
        )}

        {/* Apple CalDAV flow */}
        {step === 'apple' && (
          <div className="space-y-4">
            {!appleDetected && (
              <button onClick={() => setStep('choose')} className="text-xs text-muted-foreground underline">
                ← Use Google Calendar instead
              </button>
            )}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-800 space-y-1">
              <p className="font-semibold">App-Specific Password Required</p>
              <p>Apple requires a special password for third-party apps. Your regular Apple ID password won't work.</p>
              <a
                href="https://appleid.apple.com/account/manage"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-semibold text-amber-900 underline mt-1"
              >
                Generate one at appleid.apple.com <ExternalLink className="w-3 h-3" />
              </a>
              <p className="text-amber-600">Security → App-Specific Passwords → + sign</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Apple ID (email)</label>
              <Input
                type="email"
                placeholder="you@icloud.com"
                value={appleId}
                onChange={(e) => setAppleId(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">App-Specific Password</label>
              <Input
                type="password"
                placeholder="xxxx-xxxx-xxxx-xxxx"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                className="rounded-xl"
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button className="w-full rounded-2xl h-12 font-bold" onClick={handleAppleSync} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : '🍎 '}
              {loading ? 'Syncing...' : 'Sync Apple Calendar'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}