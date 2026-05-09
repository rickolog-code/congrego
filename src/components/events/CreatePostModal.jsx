import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCircle } from '@/lib/useCircleContext.jsx';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Image as ImageIcon } from 'lucide-react';

export default function CreatePostModal({ open, onOpenChange }) {
  const { user, activeCircleId, myMembership } = useCircle();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);

    let image_url = '';
    if (imageFile) {
      const result = await base44.integrations.Core.UploadFile({ file: imageFile });
      image_url = result.file_url;
    }

    await base44.entities.Post.create({
      circle_id: activeCircleId,
      author_email: user.email,
      author_name: myMembership?.username || user.full_name || user.email.split('@')[0],
      author_image: myMembership?.profile_image || '',
      content: content.trim(),
      image_url,
      post_type: 'regular',
      upvotes: [],
      downvotes: [],
    });

    queryClient.invalidateQueries({ queryKey: ['circle-posts'] });
    setContent('');
    setImageFile(null);
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="font-nunito">Create Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="rounded-xl min-h-[100px]"
          />
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border cursor-pointer hover:bg-muted transition-colors">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {imageFile ? imageFile.name : 'Add image'}
              </span>
              <Input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setImageFile(e.target.files[0])}
              />
            </label>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || loading}
            className="w-full rounded-xl h-11"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}