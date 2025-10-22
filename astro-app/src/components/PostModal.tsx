import React, { useState, useEffect } from 'react';
import TagSelector from './TagSelector';

interface PostModalProps {
  show: boolean;
  handleClose: () => void;
  collectionType: 'topics' | 'announcements' | 'recommendations';
  onSubmit: (data: { title: string; body: string; tags: string[] }) => void;
}

export default function PostModal({ show, handleClose, collectionType, onSubmit }: PostModalProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const collectionTitles = {
    topics: 'Start a Debate',
    announcements: 'Make an Announcement',
    recommendations: 'Share a Recommendation'
  };

  const placeholders = {
    topics: 'What topic would you like to discuss with the community?',
    announcements: 'What would you like to announce to the community?',
    recommendations: 'What would you like to recommend to the community?'
  };

  const emojis = {
    topics: '💬',
    announcements: '📢',
    recommendations: '⭐'
  };

  useEffect(() => {
    if (!show) {
      // Reset form when modal closes
      setTitle('');
      setBody('');
      setSelectedTags([]);
      setIsSubmitting(false);
    }
  }, [show]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ title, body, tags: selectedTags });
      handleClose();
    } catch (error) {
      console.error('Failed to submit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-2 md:p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#814256] to-[#6a3646] p-4 md:p-6 relative">
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 md:top-4 md:right-4 text-white hover:text-[#eccc6e] transition-colors text-xl md:text-2xl"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 md:gap-3">
              <span className="text-2xl md:text-3xl">{emojis[collectionType]}</span>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                {collectionTitles[collectionType]}
              </h2>
            </div>
          </div>

          {/* Body */}
          <div className="bg-[#4b9aaa] p-4 md:p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title Input */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-white/20 bg-white/90 focus:bg-white focus:outline-none focus:border-[#eccc6e] transition-all"
                  placeholder="Give your post a catchy title..."
                  autoFocus
                  required
                />
              </div>

              {/* Body Textarea */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  {placeholders[collectionType]}
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-white/20 bg-white/90 focus:bg-white focus:outline-none focus:border-[#eccc6e] transition-all resize-none"
                  rows={6}
                  placeholder="Share your thoughts with the community..."
                  required
                />
                <p className="text-white/80 text-sm mt-1">
                  {body.length}/1000 characters
                </p>
              </div>

              {/* Tags Section */}
              <div className="bg-white/10 rounded-lg p-4">
                <label className="block text-white font-semibold mb-3">
                  🏷️ Add Tags (Optional)
                </label>
                <TagSelector
                  onTagsChange={setSelectedTags}
                  selectedTags={selectedTags}
                />
              </div>

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row gap-2 md:gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2 md:py-3 px-4 md:px-6 text-sm md:text-base bg-white/20 text-white font-semibold rounded-lg hover:bg-white/30 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim() || !body.trim()}
                  className="flex-1 py-2 md:py-3 px-4 md:px-6 text-sm md:text-base bg-gradient-to-r from-[#eccc6e] to-[#dabb5d] text-[#814256] font-bold rounded-lg hover:from-[#dabb5d] hover:to-[#c9aa4c] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span> Publishing...
                    </span>
                  ) : (
                    'Publish Post'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}