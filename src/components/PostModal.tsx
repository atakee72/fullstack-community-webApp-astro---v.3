import React, { useState, useEffect, useRef } from 'react';
import { RemoveScroll } from 'react-remove-scroll';
import TagSelector from './TagSelector';
import { useModalHistory } from '../hooks/useModalHistory';

interface PostImage {
  url: string;
  publicId: string;
}

interface PostModalProps {
  show: boolean;
  handleClose: () => void;
  collectionType: 'topics' | 'announcements' | 'recommendations';
  onSubmit: (data: { title: string; body: string; tags: string[]; images: PostImage[] }) => void;
  editMode?: boolean;
  initialData?: {
    id?: string;
    title?: string;
    body?: string;
    tags?: string[];
    images?: PostImage[];
  };
}

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function PostModal({ show, handleClose, collectionType, onSubmit, editMode = false, initialData }: PostModalProps) {
  // Back button / iOS swipe-back / Android back gesture → close modal (don't leave page).
  useModalHistory(show, handleClose);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; body?: string; images?: string }>({});

  // Image state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<PostImage[]>([]);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    topics: '\u{1F4AC}',
    announcements: '\u{1F4E2}',
    recommendations: '\u2B50'
  };

  useEffect(() => {
    if (!show) {
      // Reset form when modal closes
      setTitle('');
      setBody('');
      setSelectedTags([]);
      setIsSubmitting(false);
      setErrors({});
      setSelectedFiles([]);
      setUploadProgress('');
      setExistingImages([]);
      // Revoke preview URLs
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      return;
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
    // Body scroll lock is handled by the <RemoveScroll> wrapper in the return JSX.
  }, [show, handleClose]);

  // Separate useEffect for populating form in edit mode
  useEffect(() => {
    if (show && editMode && initialData) {
      setTitle(initialData.title || '');
      setBody(initialData.body || '');
      setSelectedTags(initialData.tags || []);
      setExistingImages(initialData.images || []);
    }
  }, [show, editMode, initialData]);

  const totalImageCount = existingImages.length + selectedFiles.length;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = MAX_IMAGES - totalImageCount;
    if (remaining <= 0) {
      setErrors(prev => ({ ...prev, images: `Maximum ${MAX_IMAGES} images allowed` }));
      return;
    }

    const filesToAdd: File[] = [];
    const newPreviews: string[] = [];

    for (const file of files.slice(0, remaining)) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > MAX_FILE_SIZE) {
        setErrors(prev => ({ ...prev, images: `"${file.name}" exceeds 5MB limit` }));
        continue;
      }
      filesToAdd.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    setSelectedFiles(prev => [...prev, ...filesToAdd]);
    setPreviewUrls(prev => [...prev, ...newPreviews]);
    if (filesToAdd.length > 0) {
      setErrors(prev => ({ ...prev, images: undefined }));
    }

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<PostImage[]> => {
    if (selectedFiles.length === 0) return [];

    const uploaded: PostImage[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      setUploadProgress(`Uploading ${i + 1}/${selectedFiles.length}...`);
      const formData = new FormData();
      formData.append('file', selectedFiles[i]);

      const response = await fetch('/api/posts/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `Failed to upload image ${i + 1}`);
      }

      const result = await response.json();
      uploaded.push({ url: result.url, publicId: result.publicId });
    }
    setUploadProgress('');
    return uploaded;
  };

  const validateForm = () => {
    const newErrors: { title?: string; body?: string; images?: string } = {};

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
      // Upload new images first
      const newImages = await uploadImages();
      const allImages = [...existingImages, ...newImages];

      await onSubmit({ title, body, tags: selectedTags, images: allImages });
      // Reset form fields after successful submission
      setTitle('');
      setBody('');
      setSelectedTags([]);
      setSelectedFiles([]);
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      setExistingImages([]);
      setErrors({});
      handleClose();
    } catch (error: any) {
      console.error('Failed to submit:', error);
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
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-gradient-to-r from-[#814256] to-[#6a3646] p-3 md:p-4 relative">
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 md:top-4 md:right-4 text-white hover:text-[#eccc6e] transition-colors text-xl md:text-2xl"
            >
              {'\u2715'}
            </button>
            <div className="flex items-center gap-2 md:gap-3">
              <span className="text-2xl md:text-3xl">{emojis[collectionType]}</span>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                {collectionTitles[collectionType]}
              </h2>
            </div>
          </div>

          {/* Body */}
          <div className="bg-[#c9c4b9] p-3 md:p-4 overflow-y-auto max-h-[calc(95vh-80px)]">
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
                    {'\u26A0\uFE0F'} {errors.title}
                  </p>
                )}
                {!errors.title && title.length < 5 && (
                  <p className="text-white text-xs mt-1 bg-[#4b9aaa] px-2 py-0.5 rounded">
                    {'\u26A0\uFE0F'} Title must be at least 5 characters
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
                    {'\u26A0\uFE0F'} {errors.body}
                  </p>
                )}
                {!errors.body && body.length < 10 && (
                  <p className="text-white text-xs mt-1 bg-[#4b9aaa] px-2 py-0.5 rounded">
                    {'\u26A0\uFE0F'} Content must be at least 10 characters
                  </p>
                )}
                <p className="text-[#814256]/70 text-xs mt-0.5">
                  {body.length}/5000 characters
                </p>
              </div>

              {/* Image Upload Section */}
              <div className="bg-white/60 rounded-lg p-3">
                <label className="block text-[#814256] font-semibold mb-2 text-sm">
                  {'\u{1F4F7}'} Add Images (Optional, max {MAX_IMAGES})
                </label>

                {/* Preview Grid */}
                {(existingImages.length > 0 || previewUrls.length > 0) && (
                  <div className="grid grid-cols-5 gap-2 mb-2">
                    {existingImages.map((img, i) => (
                      <div key={`existing-${i}`} className="relative aspect-square rounded-lg overflow-hidden group">
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(i)}
                          className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {'\u2715'}
                        </button>
                      </div>
                    ))}
                    {previewUrls.map((url, i) => (
                      <div key={`new-${i}`} className="relative aspect-square rounded-lg overflow-hidden group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeNewImage(i)}
                          className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {'\u2715'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add button */}
                {totalImageCount < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 border-2 border-dashed border-[#814256]/30 rounded-lg text-[#814256]/70 text-sm hover:border-[#814256]/60 hover:text-[#814256] transition-colors"
                  >
                    + Add images ({totalImageCount}/{MAX_IMAGES})
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {errors.images && (
                  <p className="text-white text-xs mt-1 bg-red-400 px-2 py-0.5 rounded">
                    {errors.images}
                  </p>
                )}

                {uploadProgress && (
                  <p className="text-[#814256] text-xs mt-1 font-medium">{uploadProgress}</p>
                )}
              </div>

              {/* Tags Section */}
              <div className="bg-[#4b9aaa] rounded-lg p-3">
                <label className="block text-white font-semibold mb-2 text-sm">
                  {'\u{1F3F7}\uFE0F'} Add Tags (Optional)
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
                      <span className="animate-spin">{'\u231B'}</span> {uploadProgress || 'Publishing...'}
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
    </RemoveScroll>
  );
}
