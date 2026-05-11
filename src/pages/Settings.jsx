import { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCircle } from '@/lib/useCircleContext.jsx';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, LogOut, UserPlus, Plus, Copy, Check,
  Pencil, Trash2, Users, Crown, Loader2, Bell, CalendarDays,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import CreateCircleModal from '@/components/circles/CreateCircleModal';
import JoinCircleModal from '@/components/circles/JoinCircleModal';
import ProfileImagePicker from '@/components/profile/ProfileImagePicker';

export default function Settings() {
  const { user, activeCircle, activeCircleId, myMembership, refreshCircles } = useCircle();
  const queryClient = useQueryClient();
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

  const isHost = myMembership?.role === 'host';

  const { data: members = [] } = useQuery({
    queryKey: ['circle-members', activeCircleId],
    queryFn: () => base44.entities.CircleMember.filter({ circle_id: activeCircleId }),
    enabled: !!activeCircleId,
  });

  const handleUpdateUsername = async () => {
    if (!newUsername.trim() || !myMembership) return;
    await base44.entities.CircleMember.update(myMembership.id, { username: newUsername.trim() });
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
    if (!myMembership) return;
    await base44.entities.CircleMember.update(myMembership.id, { profile_image: url });
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

  const handleLeaveCircle = async () => {
    if (!myMembership) return;
    await base44.entities.CircleMember.delete(myMembership.id);
    if (activeCircle) {
      await base44.entities.Circle.update(activeCircle.id, {
        member_count: Math.max(0, (activeCircle.member_count || 1) - 1),
      });
    }
    localStorage.removeItem('activeCircleId');
    refreshCircles();
    queryClient.invalidateQueries({ queryKey: ['circle-members'] });
  };

  const handleRemoveMember = async (member) => {
    if (!isHost || !activeCircle) return;
    await base44.entities.Post.create({
      circle_id: activeCircleId,
      author_email: user.email,
      author_name: myMembership?.username || user.full_name,
      author_image: myMembership?.profile_image || '',
      content: `🗳️ Vote to remove ${member.username || member.user_email} from the circle.`,
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

  const handleSyncCalendar = async () => {
    // Request calendar access — on mobile this opens system permission
    // For now we mark as synced in their membership record
    if (!myMembership) return;
    await base44.entities.CircleMember.update(myMembership.id, { calendar_synced: true });
    queryClient.invalidateQueries({ queryKey: ['circle-members'] });
    queryClient.invalidateQueries({ queryKey: ['my-memberships'] });
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

      {/* Profile Section */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
        <h3 className="text-sm font-bold text-muted-foreground">Profile</h3>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowProfilePicker(true)}
            className="relative group"
          >
            {myMembership?.profile_image ? (
              <img src={myMembership.profile_image} alt="" className="w-16 h-16 rounded-2xl object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
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
          </div>
        </div>

        {/* Notifications & Calendar Prompts */}
        <div className="space-y-2 pt-1">
          {!notifEnabled && (
            <button
              onClick={handleEnableNotifications}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-left"
            >
              <Bell className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span className="text-xs font-medium text-amber-800">Enable notifications to make the app more useful</span>
            </button>
          )}
          {!calendarSynced && (
            <button
              onClick={handleSyncCalendar}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-left"
            >
              <CalendarDays className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-xs font-medium text-blue-800">Sync your calendar so people know when you're busy</span>
            </button>
          )}
        </div>
      </div>

      {/* Circle Section */}
      {activeCircle && (
        <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-muted-foreground">Circle</h3>
            {isHost && <Crown className="w-4 h-4 text-amber-500" />}
          </div>
          <div className="flex items-center gap-3">
            {/* Circle image — clickable for host */}
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
              <p className="text-xs text-muted-foreground">{activeCircle.member_count || 0} members</p>
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
        {activeCircle && (
          <Button variant="outline" className="w-full rounded-xl justify-start gap-2 text-destructive hover:text-destructive" onClick={handleLeaveCircle}>
            <Trash2 className="w-4 h-4" /> Leave Circle
          </Button>
        )}
        <Separator />
        <Button
          variant="ghost"
          className="w-full rounded-xl justify-start gap-2 text-destructive hover:text-destructive"
          onClick={() => base44.auth.logout()}
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
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-muted">
                <div className="flex items-center gap-2">
                  {m.profile_image ? (
                    <img src={m.profile_image} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{(m.username || m.user_email)?.[0]?.toUpperCase()}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{m.username || m.user_email?.split('@')[0]}</p>
                    {m.role === 'host' && <span className="text-[10px] text-amber-600 font-semibold">Host</span>}
                  </div>
                </div>
                {isHost && m.user_email !== user?.email && (
                  <button
                    onClick={() => handleRemoveMember(m)}
                    className="text-xs text-destructive font-semibold px-2 py-1 rounded-lg hover:bg-destructive/10"
                  >
                    Start Vote
                  </button>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}