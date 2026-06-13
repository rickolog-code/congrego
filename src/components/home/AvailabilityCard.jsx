import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import ProfileImageViewer from '@/components/profile/ProfileImageViewer';

const statusColors = {
  free: 'bg-green-500 text-white border-green-400',
  busy: 'bg-red-500 text-white border-red-400',
  maybe: 'bg-amber-500 text-white border-amber-400',
  unset: 'bg-muted text-muted-foreground border-border',
};

export default function AvailabilityCard({ member, isMe, onUpdateAvailability }) {
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showReadNote, setShowReadNote] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [note, setNote] = useState(member.availability_note || '');
  const today = format(new Date(), 'yyyy-MM-dd');
  const isToday = member.availability_date === today;
  const currentAvail = isToday ? (member.availability || 'unset') : 'unset';

  const handleSelect = (status) => {
    if (!isMe) return;
    if (status === 'maybe') {
      setShowNoteModal(true);
      return;
    }
    onUpdateAvailability(status, '');
  };

  const handleSaveNote = () => {
    onUpdateAvailability('maybe', note);
    setShowNoteModal(false);
  };

  const hasMaybeNote = currentAvail === 'maybe' && member.availability_note;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 p-3 bg-card rounded-2xl border border-border shadow-sm"
      >
        <button onClick={() => setShowProfile(true)} className="relative flex-shrink-0">
          {member.profile_image ? (
            <img
              src={member.profile_image}
              alt=""
              className="w-11 h-11 rounded-full object-cover"
              style={{ border: `3px solid ${member.theme_color || '#64B5F6'}` }}
            />
          ) : (
            <div
              className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center"
              style={{ border: `3px solid ${member.theme_color || '#64B5F6'}` }}
            >
              <span className="text-sm font-bold text-primary">
                {(member.username || member.user_email)?.[0]?.toUpperCase()}
              </span>
            </div>
          )}
          {member.role === 'host' && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full flex items-center justify-center">
              <span className="text-[8px]">👑</span>
            </div>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">
            {member.username || member.user_email?.split('@')[0]}
            {isMe && <span className="text-muted-foreground font-normal ml-1">(you)</span>}
          </p>
          {hasMaybeNote && !isMe && (
            <button
              onClick={() => setShowReadNote(true)}
              className="text-xs text-amber-600 hover:underline"
            >
              View availability note
            </button>
          )}
        </div>

        <div className="flex gap-1.5">
          {[
            { status: 'free', icon: Check },
            { status: 'busy', icon: X },
            { status: 'maybe', icon: HelpCircle },
          ].map(({ status, icon: Icon }) => (
            <motion.button
              key={status}
              whileTap={isMe ? { scale: 0.85 } : {}}
              onClick={() => handleSelect(status)}
              className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                currentAvail === status ? statusColors[status] : 'bg-background border-border text-muted-foreground'
              } ${isMe ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
            >
              <Icon className="w-4 h-4" />
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Maybe note modal - write */}
      <Dialog open={showNoteModal} onOpenChange={setShowNoteModal}>
        <DialogContent className="rounded-3xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="font-nunito">When are you free?</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="e.g. Free after 7 PM..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-xl"
          />
          <Button onClick={handleSaveNote} className="rounded-xl">Save</Button>
        </DialogContent>
      </Dialog>

      {/* Profile viewer */}
      <ProfileImageViewer
        open={showProfile}
        onOpenChange={setShowProfile}
        imageUrl={member.profile_image}
        name={member.username || member.user_email?.split('@')[0]}
      />

      {/* Maybe note modal - read */}
      <Dialog open={showReadNote} onOpenChange={setShowReadNote}>
        <DialogContent className="rounded-3xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="font-nunito">
              {member.username || member.user_email?.split('@')[0]}'s Availability
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{member.availability_note || 'No note added.'}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}