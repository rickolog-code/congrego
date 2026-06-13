import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { Loader2, ExternalLink, Eye, EyeOff } from 'lucide-react';

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
  const [step, setStep] = useState(appleDetected ? 'apple' : 'choose');
  const [appleId, setAppleId] = useState(userEmail || '');
  const [appPassword, setAppPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setStep(appleDetected ? 'apple' : 'choose');
    setAppPassword('');
    setError('');
    setLoading(false);
    setShowPassword(false);
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
    try {
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
    } catch (e) {
      setLoading(false);
      const msg = e?.response?.data?.error || e?.message || 'Connection failed. Check your details and try again.';
      setError(msg);
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
            <p className="text-sm text-center text-muted-foreground">Choose your calendar provider:</p>
            <div className="grid grid-cols-2 gap-3">
              {/* Google Card */}
              <button
                onClick={() => setStep('google')}
                className="flex flex-col items-center justify-between gap-3 rounded-3xl p-5 text-primary-foreground transition-transform active:scale-95"
                style={{ background: 'linear-gradient(145deg, hsl(152,60%,32%), hsl(152,50%,22%))', boxShadow: '0 6px 24px hsl(152 55% 28% / 0.55), 0 2px 8px hsl(152 55% 28% / 0.3)' }}
              >
                <img
                  src="https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png"
                  alt="Google"
                  className="w-12 h-12"
                />
                <span className="font-bold text-base leading-tight text-center">Google<br/>Calendar</span>
                <span className="text-xs font-semibold bg-white/20 rounded-full px-4 py-1.5">Connect</span>
              </button>

              {/* Apple Card */}
              <button
                onClick={() => setStep('apple')}
                className="flex flex-col items-center justify-between gap-3 rounded-3xl p-5 text-gray-900 transition-transform active:scale-95"
                style={{ background: 'linear-gradient(145deg, #e8e8e8, #d0d0d0)', boxShadow: '0 6px 24px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)' }}
              >
                {/* Real Apple logo SVG */}
                <svg viewBox="0 0 814 1000" className="w-12 h-12 fill-gray-900" xmlns="http://www.w3.org/2000/svg">
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-194.3 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
                </svg>
                <span className="font-bold text-base leading-tight text-center">Apple<br/>Calendar</span>
                <span className="text-xs font-semibold bg-black/10 rounded-full px-4 py-1.5">Connect</span>
              </button>
            </div>
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
              <button onClick={() => setStep('choose')} className="text-xs text-muted-foreground underline flex items-center gap-1">
                ← Use Google Calendar instead
              </button>
            )}

            {/* Info box */}
            <div className="border rounded-2xl p-4 text-xs space-y-2" style={{ background: 'linear-gradient(135deg, #ffb347, #ffa020)', borderColor: '#f90' }}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(255,255,255,0.3)' }}>
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M12 1C5.93 1 1 5.93 1 12s4.93 11 11 11 11-4.93 11-11S18.07 1 12 1zm1 16h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                </div>
                <p className="leading-snug text-gray-700">
                  Apple requires a special password that takes a few seconds to generate{' '}
                  <a href="https://appleid.apple.com/account/manage" target="_blank" rel="noopener noreferrer" className="underline font-semibold text-gray-800">here</a>.
                </p>
              </div>
              <div className="flex items-center gap-1 text-gray-600 flex-wrap">
                <span>Security</span>
                <span>→</span>
                <span>App-Specific Passwords</span>
                <span>→</span>
                <span>+ sign</span>
              </div>
              <p className="font-bold text-gray-800">This is NOT your Apple ID password</p>
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
              <a href="https://appleid.apple.com/account/manage" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-muted-foreground underline">
                Generate your password here
              </a>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  className="rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            {/* Apple-style connect button */}
            <button
              onClick={handleAppleSync}
              disabled={loading}
              className="w-full rounded-full h-14 flex items-center justify-center gap-3 font-bold text-base text-gray-900 disabled:opacity-60 transition-transform active:scale-95"
              style={{ background: 'linear-gradient(145deg, #e8e8e8, #d0d0d0)', boxShadow: '0 6px 20px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.10)' }}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg viewBox="0 0 814 1000" className="w-5 h-5 fill-gray-900" xmlns="http://www.w3.org/2000/svg">
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-194.3 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
                </svg>
              )}
              {loading ? 'Connecting to iCloud…' : 'Connect Apple Calendar'}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}