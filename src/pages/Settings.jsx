import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCircle } from '@/lib/useCircleContext.jsx';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, LogOut, UserPlus, Plus, Copy, Check,
  Pencil, Trash2, Users, Crown, Loader2, Bell, CalendarDays, X,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import CreateCircleModal from '@/components/circles/CreateCircleModal';
import JoinCircleModal from '@/components/circles/JoinCircleModal';
import PrivacyModeToggle from '@/components/settings/PrivacyModeToggle';
import ProfileImagePicker from '@/components/profile/ProfileImagePicker';
import ColorPickerModal from '@/components/profile/ColorPickerModal';
import CalendarSyncModal from '@/components/settings/CalendarSyncModal';
import ManageSyncedCalendarsModal from '@/components/settings/ManageSyncedCalendarsModal';

export default function Settings() {
  const { user, activeCircle, activeCircleId, myMembership, memberships, refreshCircles, circles, switchCircle } = useCircle();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [transferTarget, setTransferTarget] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [editingCircleName, setEditingCircleName] = useState(false);
  const [newCircleName, setNewCircleName] = useState('');
  const [copied, setCopied] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showProfilePicker, setShowProfilePicker] = useState(false);
  const [showCircleImagePicker, setShowCircleImagePicker] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState('Notification' in window && Notification.permission === 'granted');
  const [calendarSynced, setCalendarSynced] = useState(myMembership?.calendar_synced || false);
  const [showCalendarSync, setShowCalendarSync] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(myMembership?.privacy_mode || false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showManageCalendars, setShowManageCalendars] = useState(false);
  const [transferNotice, setTransferNotice] = useState(null);

  // Auto-dismiss transfer notice after 4 seconds
  useEffect(() => {
    if (!transferNotice) return;
    const timer = setTimeout(() => setTransferNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [transferNotice]);

  const isHost = myMembership?.role === 'host';

  const { data: members = [] } = useQuery({
    queryKey: ['circle-members', activeCircleId],
    queryFn: () => base44.entities.CircleMember.filter({ circle_id: activeCircleId }),
    enabled: !!activeCircleId,
  });

  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) return;
    await base44.auth.updateMe({ username: newUsername.trim() });
    await Promise.all(
      memberships.map(m => base44.entities.CircleMember.update(m.id, { username: newUsername.trim() }))
    );
    queryClient.invalidateQueries({ queryKey: ['circle-members'] });
    queryClient.invalidateQueries({ queryKey: ['my-memberships'] });
    setEditingName(false);
  };

  const handleUpdateCircleName = async () => {
    if (!newCircleName.trim() || !activeCircle) return;
    await base44.entities.Circle.update(activeCircle.id, { name: newCircleName.trim() });
    refreshCircles();
    setEditingCircleName(false);
  };

  const handleSelectProfileImage = async (url) => {
    await base44.auth.updateMe({ profile_image: url });
    await Promise.all(
      memberships.map(m => base44.entities.CircleMember.update(m.id, { profile_image: url }))
    );
    queryClient.invalidateQueries({ queryKey: ['circle-members'] });
    queryClient.invalidateQueries({ queryKey: ['my-memberships'] });
  };

  const handleSelectColor = async (color) => {
    if (!myMembership) return;
    await base44.entities.CircleMember.update(myMembership.id, { theme_color: color });
    queryClient.invalidateQueries({ queryKey: ['circle-members'] });
    queryClient.invalidateQueries({ queryKey: ['my-memberships'] });
  };

  const handleSelectCircleImage = async (url) => {
    if (!activeCircle) return;
    await base44.entities.Circle.update(activeCircle.id, { image_url: url });
    refreshCircles();
  };

  const handleGenerateInvite = async () => {
    if (!activeCircle) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await base44.entities.Circle.update(activeCircle.id, {
      invite_code: code,
      invite_expires_at: expires,
    });
    refreshCircles();
  };

  const handleCopyCode = () => {
    if (activeCircle?.invite_code) {
      navigator.clipboard.writeText(activeCircle.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDeleteCircle = async () => {
    if (!activeCircleId) return;
    setDeleting(true);
    try {
      await base44.functions.invoke('deleteCircleWithData', { circleId: activeCircleId });
      const nextCircle = circles.find(c => c.id !== activeCircleId);
      switchCircle(nextCircle ? nextCircle.id : null);
      refreshCircles();
      queryClient.invalidateQueries({ queryKey: ['circle-members'] });
      queryClient.invalidateQueries({ queryKey: ['circle-posts'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      navigate('/');
    } catch {
      toast({ description: 'Failed to delete circle.' });
    } finally {
      setDeleting(false);
    }
  };

  const handleLeaveCircle = async () => {
    if (!myMembership) return;

    if (activeCircle && isHost) {
      await base44.entities.Circle.update(activeCircle.id, {
        member_count: Math.max(0, (activeCircle.member_count || 1) - 1),
      });
    }

    if (isHost) {
      const otherMembers = members.filter(m => m.user_email !== user?.email);
      if (otherMembers.length > 0) {
        const newHost = otherMembers[Math.floor(Math.random() * otherMembers.length)];
        await base44.entities.CircleMember.update(newHost.id, { role: 'host' });
        await base44.entities.Circle.update(activeCircleId, { host_email: newHost.user_email });
      }
    }

    await base44.entities.CircleMember.delete(myMembership.id);
    const currentUser = await base44.auth.me();
    const updatedCircleIds = (currentUser.circle_ids || []).filter(id => id !== activeCircleId);
    const updatedHostedIds = (currentUser.hosted_circle_ids || []).filter(id => id !== activeCircleId);
    await base44.auth.updateMe({
      circle_ids: updatedCircleIds,
      hosted_circle_ids: updatedHostedIds,
    });
    const nextCircle = circles.find(c => c.id !== activeCircleId);
    switchCircle(nextCircle ? nextCircle.id : null);
    refreshCircles();
    queryClient.invalidateQueries({ queryKey: ['circle-members'] });
    navigate('/');
  };

  const handleTransferHost = async (member) => {
    if (!isHost || !activeCircle) return;
    await base44.entities.CircleMember.update(member.id, { role: 'host' });
    await base44.entities.CircleMember.update(myMembership.id, { role: 'member' });
    await base44.entities.Circle.update(activeCircleId, { host_email: member.user_email });
    queryClient.invalidateQueries({ queryKey: ['circle-members'] });
    queryClient.invalidateQueries({ queryKey: ['my-memberships'] });
    refreshCircles();
    setTransferTarget(null);
    setShowMembers(false);
    setTransferNotice(`${member.username || member.user_email} is now the host.`);
  };

  const handleRemoveMember = async (member) => {
    if (!isHost || !activeCircle) return;
    await base44.entities.Post.create({
      circle_id: activeCircleId,
      author_email: user.email,
      author_name: myMembership?.username || user.full_name,
      author_image: myMembership?.profile_image || '',
      content: `Vote to remove ${member.username || member.user_email} from the circle.`,
      post_type: 'vote',
      vote_target_email: member.user_email,
      upvotes: [],
      downvotes: [],
      yes_votes: [],
      no_votes: [],
    });
    queryClient.invalidateQueries({ queryKey: ['circle-posts'] });
    setShowMembers(false);
  };

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      setNotifEnabled(true);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js');
      }
    }
  };

  const handleSyncComplete = async (provider) => {
    if (myMembership) {
      await base44.entities.CircleMember.update(myMembership.id, {
        calendar_synced: true,
        calendar_provider: provider,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['circle-members'] });
    queryClient.invalidateQueries({ queryKey: ['my-memberships'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    setCalendarSynced(true);
  };

  const inviteExpired = activeCircle?.invite_expires_at
    ? new Date(activeCircle.invite_expires_at) < new Date()
    : true;

  return (
    <div className="px-4 pt-6 pb-24 space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/" className="p-2 rounded-xl bg-card border border-border hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-extrabold">Settings</h1>
      </div>

    {/* Transfer Notice - Fixed top banner */}
<AnimatePresence>
  {transferNotice && (
    <motion.div
      initial={{ opacity: 0, y: -80 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -80 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
    >
      <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-2xl shadow-lg pointer-events-auto max-w-sm w-full">
        <Check className="w-4 h-4 text-primary flex-shrink-0" />
        <p className="text-sm font-medium flex-1">{transferNotice}</p>
        <button
          onClick={() => setTransferNotice(null)}
          className="p-1 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </motion.div>
  )}
</AnimatePresence>

      {/* Profile Section */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
        <h3 className="text-sm font-bold text-muted-foreground">Profile</h3>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowProfilePicker(true)}
            className="relative group flex-shrink-0"
          >
            {myMembership?.profile_image ? (
              <img
                src={myMembership.profile_image}
                alt=""
                className="w-16 h-16 rounded-2xl object-cover"
                style={{ border: `3px solid ${myMembership?.theme_color || '#64B5F6'}` }}
              />
            ) : (
              <div
                className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"
                style={{ border: `3px solid ${myMembership?.theme_color || '#64B5F6'}` }}
              >
                <span className="text-2xl font-bold text-primary">
                  {(user?.full_name || user?.email)?.[0]?.toUpperCase()}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/30 rounded-2xl opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
              <Pencil className="w-4 h-4 text-white" />
            </div>
          </button>
          <div className="flex-1">
            {editingName ? (
              <div className="flex gap-2">
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="rounded-xl text-sm h-9"
                  placeholder="New username"
                />
                <Button size="sm" className="rounded-xl" onClick={handleUpdateUsername}>
                  <Check className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="font-bold">{myMembership?.username || user?.full_name}</p>
                <button onClick={() => { setNewUsername(myMembership?.username || ''); setEditingName(true); }}>
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <button
              onClick={() => setShowColorPicker(true)}
              className="mt-2 flex items-center gap-2 group"
            >
              <div
                className="w-6 h-6 rounded-full border-2 border-white shadow-md transition-transform group-hover:scale-110"
                style={{ background: myMembership?.theme_color || '#64B5F6' }}
              />
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">My color</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications Card */}
      {!notifEnabled && (
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">Notifications</p>
            <p className="text-xs text-muted-foreground">Stay in the loop with your circle</p>
          </div>
          <button
            onClick={handleEnableNotifications}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
          >
            Enable Now
          </button>
        </div>
      )}

      {/* Manage Synced Calendars */}
      {calendarSynced && (
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">Calendar Sync</p>
            <p className="text-xs text-muted-foreground">Choose which calendars to sync</p>
          </div>
          <button
            onClick={() => setShowManageCalendars(true)}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
          >
            Manage
          </button>
        </div>
      )}

      {/* Calendar Card */}
      {!calendarSynced && (
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">Calendar Sync</p>
            <p className="text-xs text-muted-foreground">Let others know when you're busy</p>
          </div>
          <button
            onClick={() => setShowCalendarSync(true)}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
          >
            Enable Now
          </button>
        </div>
      )}

      {/* Privacy Mode */}
      <PrivacyModeToggle
        enabled={privacyMode}
        onToggle={async () => {
          if (!myMembership) return;
          const next = !privacyMode;
          setPrivacyMode(next);
          await base44.entities.CircleMember.update(myMembership.id, { privacy_mode: next });
          queryClient.invalidateQueries({ queryKey: ['circle-members'] });
          queryClient.invalidateQueries({ queryKey: ['my-memberships'] });
        }}
      />

      {/* Circle Section */}
      {activeCircle && (
        <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-muted-foreground">Circle</h3>
            {isHost && <Crown className="w-4 h-4 text-amber-500" />}
          </div>
          <div className="flex items-center gap-3">
            {isHost ? (
              <button onClick={() => setShowCircleImagePicker(true)} className="relative group">
                {activeCircle.image_url ? (
                  <img src={activeCircle.image_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: activeCircle.color || 'hsl(var(--primary))' }}
                  >
                    {activeCircle.name?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Pencil className="w-3 h-3 text-white" />
                </div>
              </button>
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                style={{ background: activeCircle.color || 'hsl(var(--primary))' }}
              >
                {activeCircle.name?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              {isHost && editingCircleName ? (
                <div className="flex gap-2">
                  <Input
                    value={newCircleName}
                    onChange={(e) => setNewCircleName(e.target.value)}
                    className="rounded-xl text-sm h-8"
                    placeholder="Circle name"
                  />
                  <Button size="sm" className="rounded-xl h-8" onClick={handleUpdateCircleName}>
                    <Check className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{activeCircle.name}</p>
                  {isHost && (
                    <button onClick={() => { setNewCircleName(activeCircle.name || ''); setEditingCircleName(true); }}>
                      <Pencil className="w-3 h-3 text-muted-foreground" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Invite Code */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">Invite Code</p>
              {(isHost || !inviteExpired) && (
                <button onClick={handleGenerateInvite} className="text-xs text-primary font-semibold">
                  {inviteExpired ? 'Generate' : 'Regenerate'}
                </button>
              )}
            </div>
            {activeCircle.invite_code && !inviteExpired && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleCopyCode}
                className="w-full flex items-center justify-between px-4 py-3 bg-primary/5 rounded-xl border border-primary/20"
              >
                <span className="text-lg font-bold tracking-[0.3em] text-primary">
                  {activeCircle.invite_code}
                </span>
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              </motion.button>
            )}
            {activeCircle.invite_expires_at && !inviteExpired && (
              <p className="text-[10px] text-muted-foreground">
                Expires {format(new Date(activeCircle.invite_expires_at), 'h:mm a')}
              </p>
            )}
          </div>

          {/* Members */}
          <button
            onClick={() => setShowMembers(true)}
            className="w-full flex items-center justify-between px-4 py-3 bg-muted rounded-xl"
          >
            <span className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" /> Manage Members
            </span>
            <span className="text-xs text-muted-foreground">{members.length}</span>
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        <Button variant="outline" className="w-full rounded-xl justify-start gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> Create New Circle
        </Button>
        <Button variant="outline" className="w-full rounded-xl justify-start gap-2" onClick={() => setShowJoin(true)}>
          <UserPlus className="w-4 h-4" /> Join Circle
        </Button>
        {activeCircle && isHost && members.length === 1 && (
          <Button variant="outline" className="w-full rounded-xl justify-start gap-2 text-destructive hover:text-destructive" onClick={() => setShowDeleteConfirm(true)} disabled={deleting}>
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete Circle & All Data
          </Button>
        )}
        {activeCircle && members.length > 1 && (
          <Button variant="outline" className="w-full rounded-xl justify-start gap-2 text-destructive hover:text-destructive" onClick={() => setShowLeaveConfirm(true)}>
            <Trash2 className="w-4 h-4" /> Leave Circle
          </Button>
        )}
        <Separator />
        <Button
          variant="ghost"
          className="w-full rounded-xl justify-start gap-2 text-destructive hover:text-destructive"
          onClick={() => setShowLogoutConfirm(true)}
        >
          <LogOut className="w-4 h-4" /> Logout
        </Button>
      </div>

      {/* Members Dialog */}
      <Dialog open={showMembers} onOpenChange={setShowMembers}>
        <DialogContent className="rounded-3xl max-w-sm mx-auto max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Members</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {members.map((m) => {
              const isThisHost = m.role === 'host';
              const isMe = m.user_email === user?.email;
              return (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-muted">
                  <div className="flex items-center gap-2">
                    {m.profile_image ? (
                      <img src={m.profile_image} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">{(m.username || m.user_email)?.[0]?.toUpperCase()}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium">{m.username || m.user_email?.split('@')[0]}</p>
                      {isThisHost ? (
                        <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      ) : isHost ? (
                        <button onClick={() => setTransferTarget(m)} title="Make host">
                          <Crown className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {isHost && !isMe && !isThisHost && (
                    <button
                      onClick={() => handleRemoveMember(m)}
                      className="text-xs text-destructive font-semibold px-2 py-1 rounded-lg hover:bg-destructive/10"
                    >
                      Start Vote
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!transferTarget} onOpenChange={(o) => !o && setTransferTarget(null)}>
        <AlertDialogContent className="rounded-3xl max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer Host?</AlertDialogTitle>
            <AlertDialogDescription>
              Make {transferTarget?.username || transferTarget?.user_email} the new host of this circle? You'll become a regular member.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl" onClick={() => handleTransferHost(transferTarget)}>Transfer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent className="rounded-3xl max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Circle?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to leave this circle?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive hover:bg-destructive/90" onClick={handleLeaveCircle}>Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-3xl max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Circle?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the circle, all posts, comments, calendar events, and member data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive hover:bg-destructive/90" onClick={handleDeleteCircle}>Delete Everything</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent className="rounded-3xl max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Logout?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to log out?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive hover:bg-destructive/90" onClick={() => base44.auth.logout('/')}>Logout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ManageSyncedCalendarsModal
        open={showManageCalendars}
        onOpenChange={setShowManageCalendars}
        user={user}
        myMembership={myMembership}
      />

      <CalendarSyncModal
        open={showCalendarSync}
        onOpenChange={setShowCalendarSync}
        userEmail={user?.email}
        onSyncComplete={handleSyncComplete}
      />

      <CreateCircleModal open={showCreate} onOpenChange={setShowCreate} />
      <JoinCircleModal open={showJoin} onOpenChange={setShowJoin} />

      <ProfileImagePicker
        open={showProfilePicker}
        onOpenChange={setShowProfilePicker}
        onSelect={handleSelectProfileImage}
        currentImage={myMembership?.profile_image}
      />
      <ProfileImagePicker
        open={showCircleImagePicker}
        onOpenChange={setShowCircleImagePicker}
        onSelect={handleSelectCircleImage}
        currentImage={activeCircle?.image_url}
      />

      <ColorPickerModal
        open={showColorPicker}
        onOpenChange={setShowColorPicker}
        currentColor={myMembership?.theme_color}
        onSelect={handleSelectColor}
        takenColors={members
          .filter(m => m.user_email !== user?.email && m.theme_color)
          .map(m => m.theme_color)}
      />
    </div>
  );
}