import React, { useState, useEffect } from 'react';
import TagSelector from './TagSelector';

interface PostModalProps {
  show: boolean;
  handleClose: () => void;
  collectionType: 'topics' | 'announcements' | 'recommendations';
  onSubmit: (data: { title: string; body: string; tags: string[] }) => void;
  editMode?: boolean;
  initialData?: {
    id?: string;
    title?: string;
    body?: string;
    tags?: string[];
  };
}

export default function PostModal({ show, handleClose, collectionType, onSubmit, editMode = false, initialData }: PostModalProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({});

  const collectionTitles = {
    topics: editMode ? 'Edit Your Debate' : 'Start a Debate',
    announcements: editMode ? 'Edit Your Announcement' : 'Make an Announcement',
    recommendations: editMode ? 'Edit Your Recommendation' : 'Share a Recommendation'
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
      setErrors({});
    } else {
      // If in edit mode and we have initial data, populate the form
      if (editMode && initialData) {
        setTitle(initialData.title || '');
        setBody(initialData.body || '');
        setSelectedTags(initialData.tags || []);
      }

      // Add escape key listener when modal is open
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleClose();
        }
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [show, handleClose, editMode, initialData]);

  const validateForm = () => {
    const newErrors: { title?: string; body?: string } = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (title.trim().length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    if (!body.trim()) {
      newErrors.body = 'Content is required';
    } else if (body.trim().length < 10) {
      newErrors.body = 'Content must be at least 10 characters';
    } else if (body.trim().length > 5000) {
      newErrors.body = 'Content must be less than 5000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ title, body, tags: selectedTags });
      // Reset form fields after successful submission
      setTitle('');
      setBody('');
      setSelectedTags([]);
      setErrors({});
      handleClose();
    } catch (error: any) {
      console.error('Failed to submit:', error);
      // If server returns validation errors, show them
      if (error.message) {
        setErrors({ body: error.message });
      }
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
      <div className="fixed inset-0 flex items-center justify-center z-50 p-2 md:p-4" onClick={handleClose}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-gradient-to-r from-[#814256] to-[#6a3646] p-3 md:p-4 relative">
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
          <div className="bg-[#eccc6e] p-3 md:p-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Title Input */}
              <div>
                <label className="block text-[#814256] font-semibold mb-1 text-sm">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (errors.title) setErrors({ ...errors, title: undefined });
                  }}
                  className={`w-full px-3 py-2 rounded-lg border-2 text-sm ${
                    errors.title ? 'border-red-400 bg-red-50' : 'border-white/20 bg-white/90'
                  } focus:bg-white focus:outline-none focus:border-[#eccc6e] transition-all`}
                  placeholder="Give your post a catchy title... (min 5 characters)"
                  autoFocus
                />
                {errors.title && (
                  <p className="text-white text-xs mt-1 bg-[#4b9aaa] px-2 py-0.5 rounded">
                    ⚠️ {errors.title}
                  </p>
                )}
                {!errors.title && title.length < 5 && (
                  <p className="text-white text-xs mt-1 bg-[#4b9aaa] px-2 py-0.5 rounded">
                    ⚠️ Title must be at least 5 characters
                  </p>
                )}
                <p className="text-[#814256]/70 text-xs mt-0.5">
                  {title.length}/200 characters
                </p>
              </div>

              {/* Body Textarea */}
              <div>
                <label className="block text-[#814256] font-semibold mb-1 text-sm">
                  {placeholders[collectionType]}
                </label>
                <textarea
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    if (errors.body) setErrors({ ...errors, body: undefined });
                  }}
                  className={`w-full px-3 py-2 rounded-lg border-2 text-sm ${
                    errors.body ? 'border-red-400 bg-red-50' : 'border-white/20 bg-white/90'
                  } focus:bg-white focus:outline-none focus:border-[#eccc6e] transition-all resize-none`}
                  rows={4}
                  placeholder="Share your thoughts with the community... (min 10 characters)"
                />
                {errors.body && (
                  <p className="text-white text-xs mt-1 bg-[#4b9aaa] px-2 py-0.5 rounded">
                    ⚠️ {errors.body}
                  </p>
                )}
                {!errors.body && body.length < 10 && (
                  <p className="text-white text-xs mt-1 bg-[#4b9aaa] px-2 py-0.5 rounded">
                    ⚠️ Content must be at least 10 characters
                  </p>
                )}
                <p className="text-[#814256]/70 text-xs mt-0.5">
                  {body.length}/5000 characters
                </p>
              </div>

              {/* Tags Section */}
              <div className="bg-[#4b9aaa] rounded-lg p-3">
                <label className="block text-white font-semibold mb-2 text-sm">
                  🏷️ Add Tags (Optional)
                </label>
                <TagSelector
                  onTagsChange={setSelectedTags}
                  selectedTags={selectedTags}
                />
              </div>

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2 px-4 text-sm bg-white/50 text-[#814256] font-semibold rounded-lg hover:bg-white/70 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim() || !body.trim()}
                  className="flex-1 py-2 px-4 text-sm bg-gradient-to-r from-[#814256] to-[#6a3646] text-white font-bold rounded-lg hover:from-[#6a3646] hover:to-[#5a2c3c] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span> Publishing...
                    </span>
                  ) : (
                    editMode ? 'Save Changes' : 'Publish Post'
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