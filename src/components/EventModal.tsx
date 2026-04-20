import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarPlus, CalendarCog } from 'lucide-react';
import { RemoveScroll } from 'react-remove-scroll';
import TagSelector from './TagSelector';
import { useModalHistory } from '../hooks/useModalHistory';

interface EventModalProps {
  show: boolean;
  handleClose: () => void;
  onSubmit: (data: {
    title: string;
    body: string;
    startDate: Date;
    endDate: Date;
    location?: string;
    category?: 'community' | 'sports-health' | 'culture-education' | 'other';
    tags: string[];
  }) => void;
  editMode?: boolean;
  initialData?: {
    id?: string;
    title?: string;
    body?: string;
    startDate?: Date | string;
    endDate?: Date | string;
    location?: string;
    category?: 'community' | 'sports-health' | 'culture-education' | 'other';
    tags?: string[];
  };
  prefillDates?: { startDate: Date; endDate: Date };
}

export default function EventModal({
  show,
  handleClose,
  onSubmit,
  editMode = false,
  initialData,
  prefillDates
}: EventModalProps) {
  // Back button / iOS swipe-back / Android back gesture → close modal (don't leave page).
  useModalHistory(show, handleClose);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<'community' | 'sports-health' | 'culture-education' | 'other'>('other');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    title?: string;
    body?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
  }>({});

  useEffect(() => {
    if (!show) {
      // Reset form when modal closes
      setTitle('');
      setBody('');
      setStartDate('');
      setEndDate('');
      setLocation('');
      setCategory('other');
      setSelectedTags([]);
      setIsSubmitting(false);
      setErrors({});
      return;
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
    // Body scroll lock is handled by the <RemoveScroll> wrapper in the return JSX.
  }, [show, handleClose]);

  // Separate useEffect for populating form in edit mode or prefilling dates from range selection
  useEffect(() => {
    if (show && editMode && initialData) {
      setTitle(initialData.title || '');
      setBody(initialData.body || '');

      // Convert dates to datetime-local format (yyyy-MM-ddTHH:mm)
      if (initialData.startDate) {
        const start = new Date(initialData.startDate);
        setStartDate(format(start, "yyyy-MM-dd'T'HH:mm"));
      }
      if (initialData.endDate) {
        const end = new Date(initialData.endDate);
        setEndDate(format(end, "yyyy-MM-dd'T'HH:mm"));
      }

      setLocation(initialData.location || '');
      setCategory(initialData.category || 'other');
      setSelectedTags(initialData.tags || []);
    } else if (show && !editMode && prefillDates) {
      setStartDate(format(prefillDates.startDate, "yyyy-MM-dd'T'HH:mm"));
      setEndDate(format(prefillDates.endDate, "yyyy-MM-dd'T'HH:mm"));
    }
  }, [show, editMode, initialData, prefillDates]);

  const validateForm = () => {
    const newErrors: {
      title?: string;
      body?: string;
      startDate?: string;
      endDate?: string;
      location?: string;
    } = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (title.trim().length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    if (!body.trim()) {
      newErrors.body = 'Description is required';
    } else if (body.trim().length < 10) {
      newErrors.body = 'Description must be at least 10 characters';
    } else if (body.trim().length > 5000) {
      newErrors.body = 'Description must be less than 5000 characters';
    }

    if (!startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        newErrors.endDate = 'End date must be after or equal to start date';
      }
    }

    if (location && location.length > 200) {
      newErrors.location = 'Location must be less than 200 characters';
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
      await onSubmit({
        title,
        body,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location: location || undefined,
        category,
        tags: selectedTags,
      });
      // Reset form fields after successful submission
      setTitle('');
      setBody('');
      setStartDate('');
      setEndDate('');
      setLocation('');
      setCategory('other');
      setSelectedTags([]);
      setErrors({});
      handleClose();
    } catch (error: any) {
      console.error('Failed to submit event:', error);
      // If server returns validation errors, show them
      if (error.message) {
        setErrors({ body: error.message });
      }
      setIsSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <RemoveScroll enabled={show}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-2 md:p-4" onClick={handleClose}>
        <div className="bg-[#1a1d4a]/95 backdrop-blur-xl border border-white/20 border-t-white/30 rounded-xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-[#d4af37]/15 border-b border-white/10 p-3 md:p-4 relative">
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 md:top-4 md:right-4 text-white/70 hover:text-[#d4af37] transition-colors text-xl md:text-2xl"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 md:gap-3">
              {editMode ? (
                <CalendarCog className="w-6 h-6 md:w-7 md:h-7 text-[#d4af37]" strokeWidth={1.5} />
              ) : (
                <CalendarPlus className="w-6 h-6 md:w-7 md:h-7 text-[#d4af37]" strokeWidth={1.5} />
              )}
              <h2 className="text-xl md:text-2xl font-bold text-[#e8e6e1] font-['Space_Grotesk',sans-serif]">
                {editMode ? 'Edit Event' : 'Create New Event'}
              </h2>
            </div>
          </div>

          {/* Body */}
          <div className="p-3 md:p-4 overflow-y-auto max-h-[calc(95vh-80px)]">
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Title Input */}
              <div>
                <label className="block text-white/80 font-semibold mb-1 text-sm">
                  Event Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (errors.title) setErrors({ ...errors, title: undefined });
                  }}
                  className={`w-full px-3 py-2 rounded-lg border text-sm bg-white/[0.08] backdrop-blur-xl text-[#e8e6e1] placeholder-white/40 ${
                    errors.title ? 'border-red-400/60' : 'border-white/15'
                  } focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 focus:border-[#d4af37]/50 transition-all`}
                  placeholder="Give your event a descriptive title... (min 5 characters)"
                  autoFocus
                />
                {errors.title && (
                  <p className="text-red-300 text-xs mt-1 bg-red-500/20 border border-red-400/30 px-2 py-0.5 rounded">
                    ⚠️ {errors.title}
                  </p>
                )}
                <p className="text-white/50 text-xs mt-0.5">
                  {title.length}/200 characters
                </p>
              </div>

              {/* Date/Time Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Start Date/Time */}
                <div>
                  <label className="block text-white/80 font-semibold mb-1 text-sm">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    min={editMode ? undefined : format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (errors.startDate) setErrors({ ...errors, startDate: undefined });
                    }}
                    className={`w-full px-3 py-2 rounded-lg border text-sm bg-white/[0.08] backdrop-blur-xl text-[#e8e6e1] ${
                      errors.startDate ? 'border-red-400/60' : 'border-white/15'
                    } focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 focus:border-[#d4af37]/50 transition-all`}
                  />
                  {errors.startDate && (
                    <p className="text-red-300 text-xs mt-1 bg-red-500/20 border border-red-400/30 px-2 py-0.5 rounded">
                      ⚠️ {errors.startDate}
                    </p>
                  )}
                </div>

                {/* End Date/Time */}
                <div>
                  <label className="block text-white/80 font-semibold mb-1 text-sm">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    min={editMode ? undefined : format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      if (errors.endDate) setErrors({ ...errors, endDate: undefined });
                    }}
                    className={`w-full px-3 py-2 rounded-lg border text-sm bg-white/[0.08] backdrop-blur-xl text-[#e8e6e1] ${
                      errors.endDate ? 'border-red-400/60' : 'border-white/15'
                    } focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 focus:border-[#d4af37]/50 transition-all`}
                  />
                  {errors.endDate && (
                    <p className="text-red-300 text-xs mt-1 bg-red-500/20 border border-red-400/30 px-2 py-0.5 rounded">
                      ⚠️ {errors.endDate}
                    </p>
                  )}
                </div>
              </div>

              {/* Location Input */}
              <div>
                <label className="block text-white/80 font-semibold mb-1 text-sm">
                  Location (Optional)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    if (errors.location) setErrors({ ...errors, location: undefined });
                  }}
                  className={`w-full px-3 py-2 rounded-lg border text-sm bg-white/[0.08] backdrop-blur-xl text-[#e8e6e1] placeholder-white/40 ${
                    errors.location ? 'border-red-400/60' : 'border-white/15'
                  } focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 focus:border-[#d4af37]/50 transition-all`}
                  placeholder="Where will this event take place?"
                />
                {errors.location && (
                  <p className="text-red-300 text-xs mt-1 bg-red-500/20 border border-red-400/30 px-2 py-0.5 rounded">
                    ⚠️ {errors.location}
                  </p>
                )}
                <p className="text-white/50 text-xs mt-0.5">
                  {location.length}/200 characters
                </p>
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block text-white/80 font-semibold mb-1 text-sm">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-white/15 bg-white/[0.08] backdrop-blur-xl text-[#e8e6e1] text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 focus:border-[#d4af37]/50 transition-all"
                >
                  <option value="other">Other</option>
                  <option value="community">Community</option>
                  <option value="sports-health">Sports & Health</option>
                  <option value="culture-education">Culture & Education</option>
                </select>
              </div>

              {/* Description Textarea */}
              <div>
                <label className="block text-white/80 font-semibold mb-1 text-sm">
                  Event Description
                </label>
                <textarea
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    if (errors.body) setErrors({ ...errors, body: undefined });
                  }}
                  className={`w-full px-3 py-2 rounded-lg border text-sm bg-white/[0.08] backdrop-blur-xl text-[#e8e6e1] placeholder-white/40 ${
                    errors.body ? 'border-red-400/60' : 'border-white/15'
                  } focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 focus:border-[#d4af37]/50 transition-all resize-none`}
                  rows={4}
                  placeholder="Describe your event... (min 10 characters)"
                />
                {errors.body && (
                  <p className="text-red-300 text-xs mt-1 bg-red-500/20 border border-red-400/30 px-2 py-0.5 rounded">
                    ⚠️ {errors.body}
                  </p>
                )}
                <p className="text-white/50 text-xs mt-0.5">
                  {body.length}/5000 characters
                </p>
              </div>

              {/* Tags Section */}
              <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-lg p-3">
                <label className="block text-[#e8e6e1] font-semibold mb-2 text-sm">
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
                  className="flex-1 py-2 px-4 text-sm bg-white/10 backdrop-blur-xl border border-white/15 text-white/80 font-semibold rounded-lg hover:bg-white/20 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim() || !body.trim() || !startDate || !endDate}
                  className="flex-1 py-2 px-4 text-sm bg-[#d4af37] text-[#0e1033] font-bold rounded-lg hover:bg-[#b89030] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span> {editMode ? 'Saving...' : 'Creating...'}
                    </span>
                  ) : (
                    editMode ? 'Save Changes' : 'Create Event'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </RemoveScroll>
  );
}
