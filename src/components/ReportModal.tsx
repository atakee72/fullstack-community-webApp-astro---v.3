import React, { useState, useEffect } from 'react';

type ReportReason = 'spam' | 'harassment' | 'hate_speech' | 'violence' | 'inappropriate' | 'misinformation' | 'other';

type ContentType = 'topic' | 'comment' | 'announcement' | 'recommendation' | 'event';

interface ReportModalProps {
  show: boolean;
  handleClose?: () => void;
  onClose?: () => void;
  contentType: ContentType;
  contentId: string;
  contentPreview?: string;
  onSubmit: (data: { contentId: string; contentType: ContentType; reason: ReportReason; details?: string }) => Promise<{ success?: boolean; error?: string; alreadyReported?: boolean } | void>;
}

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'spam', label: 'Spam or advertising', description: 'Promotional content or repetitive posts' },
  { value: 'harassment', label: 'Harassment or bullying', description: 'Targeting or intimidating others' },
  { value: 'hate_speech', label: 'Hate speech', description: 'Attacks based on identity or beliefs' },
  { value: 'violence', label: 'Violence or threats', description: 'Threatening or promoting violence' },
  { value: 'inappropriate', label: 'Inappropriate content', description: 'Adult or offensive material' },
  { value: 'misinformation', label: 'Misinformation', description: 'False or misleading information' },
  { value: 'other', label: 'Other', description: 'Something else not listed above' }
];

// Helper to get display name for content type
const getContentTypeLabel = (type: ContentType): string => {
  const labels: Record<ContentType, string> = {
    topic: 'Post',
    comment: 'Comment',
    announcement: 'Announcement',
    recommendation: 'Recommendation',
    event: 'Event'
  };
  return labels[type] || 'Content';
};

export default function ReportModal({
  show,
  handleClose,
  onClose,
  contentType,
  contentId,
  contentPreview,
  onSubmit
}: ReportModalProps) {
  // Support both handleClose and onClose props
  const closeModal = handleClose || onClose || (() => {});
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!show) {
      // Reset form when modal closes
      setReason('');
      setDetails('');
      setIsSubmitting(false);
      setError(null);
      setSuccess(false);
      // Re-enable scroll
      const htmlElement = document.documentElement;
      htmlElement.style.overflow = '';
      htmlElement.style.touchAction = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.touchAction = '';
    } else {
      // Disable scroll when modal opens
      const scrollY = window.scrollY;
      const htmlElement = document.documentElement;
      htmlElement.style.setProperty('overflow', 'hidden', 'important');
      htmlElement.style.setProperty('touch-action', 'none', 'important');
      document.body.style.setProperty('position', 'fixed', 'important');
      document.body.style.setProperty('top', `-${scrollY}px`, 'important');
      document.body.style.setProperty('width', '100%', 'important');
      document.body.style.setProperty('overflow', 'hidden', 'important');
      document.body.style.setProperty('touch-action', 'none', 'important');

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          closeModal();
        }
      };
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
        const scrollY = document.body.style.top;
        const htmlElement = document.documentElement;
        htmlElement.style.overflow = '';
        htmlElement.style.touchAction = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      };
    }
  }, [show, closeModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setError('Please select a reason for reporting');
      return;
    }
    if (!details.trim()) {
      setError('Please explain why you are reporting this content');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await onSubmit({
        contentId,
        contentType,
        reason,
        details: details.trim() || undefined
      });

      if (result?.success !== false) {
        setSuccess(true);
        // Auto-close after 2 seconds
        setTimeout(() => {
          closeModal();
        }, 2000);
      } else {
        setError(result.error || 'Failed to submit report');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
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
        onClick={closeModal}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-2 md:p-4" onClick={closeModal}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-gradient-to-r from-[#814256] to-[#6a3646] p-3 md:p-4 relative">
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 md:top-4 md:right-4 text-white hover:text-[#eccc6e] transition-colors text-xl md:text-2xl"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 md:gap-3">
              <span className="text-2xl md:text-3xl">🚩</span>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                Report {getContentTypeLabel(contentType)}
              </h2>
            </div>
          </div>

          {/* Body */}
          <div className="bg-[#c9c4b9] p-4 md:p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {success ? (
              // Success State
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-[#4b9aaa] mb-2">Report Submitted</h3>
                <p className="text-gray-700">Thank you for reporting. Our team will review this content.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Content Preview */}
                {contentPreview && (
                  <div className="bg-white/50 rounded-lg p-3 border border-gray-300">
                    <p className="text-sm text-gray-600 mb-1 font-medium">Reporting:</p>
                    <p className="text-gray-800 text-sm line-clamp-2">{contentPreview}</p>
                  </div>
                )}

                {/* Report Reasons */}
                <div>
                  <label className="block text-[#814256] font-semibold mb-2">
                    Why are you reporting this? <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {REPORT_REASONS.map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                          reason === option.value
                            ? 'bg-[#4b9aaa]/20 border-2 border-[#4b9aaa]'
                            : 'bg-white border-2 border-transparent hover:bg-white/80'
                        }`}
                      >
                        <input
                          type="radio"
                          name="reason"
                          value={option.value}
                          checked={reason === option.value}
                          onChange={(e) => setReason(e.target.value as ReportReason)}
                          className="mt-1 accent-[#4b9aaa]"
                        />
                        <div>
                          <p className="font-medium text-gray-800">{option.label}</p>
                          <p className="text-sm text-gray-600">{option.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Additional Details */}
                <div>
                  <label className="block text-[#814256] font-semibold mb-2">
                    Explain why you're reporting this <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 bg-white focus:bg-white focus:outline-none focus:border-[#4b9aaa] transition-all resize-none"
                    rows={3}
                    placeholder="Please describe specifically what's wrong with this content..."
                    maxLength={500}
                    required
                  />
                  <p className="text-gray-600 text-sm mt-1 text-right">
                    {details.length}/500
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2 pb-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-2 px-4 text-sm bg-white/50 text-[#814256] font-semibold rounded-lg hover:bg-white/70 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !reason || !details.trim()}
                    className="flex-1 py-2 px-4 text-sm bg-gradient-to-r from-[#814256] to-[#6a3646] text-white font-bold rounded-lg hover:from-[#6a3646] hover:to-[#5a2c3c] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⏳</span> Submitting...
                      </span>
                    ) : (
                      'Submit Report'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
