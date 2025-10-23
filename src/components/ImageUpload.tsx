import React, { useState, useRef } from 'react';

interface ImageUploadProps {
  onUpload: (url: string) => void;
  uploadType?: 'profile' | 'post';
  currentImage?: string;
  className?: string;
}

export default function ImageUpload({
  onUpload,
  uploadType = 'profile',
  currentImage,
  className = ''
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string>(currentImage || '');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }

    setError('');

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload the file
    await uploadImage(file);
  };

  const uploadImage = async (file: File) => {
    setIsUploading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('You must be logged in to upload images');
      }

      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', uploadType);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload image');
      }

      const data = await response.json();
      onUpload(data.url);
      setPreview(data.url);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to upload image');
      setPreview('');
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`image-upload ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      {uploadType === 'profile' ? (
        <div className="text-center">
          <div
            onClick={triggerFileInput}
            className="relative inline-block cursor-pointer group"
          >
            {preview ? (
              <img
                src={preview}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-4 border-[#4b9aaa] group-hover:opacity-80 transition-opacity"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-200 border-4 border-[#4b9aaa] flex items-center justify-center group-hover:bg-gray-300 transition-colors">
                <span className="text-gray-500 text-4xl">👤</span>
              </div>
            )}

            <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {isUploading ? (
                <span className="text-white animate-spin text-2xl">⏳</span>
              ) : (
                <span className="text-white text-2xl">📷</span>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-600 mt-2">
            {isUploading ? 'Uploading...' : 'Click to upload profile picture'}
          </p>
        </div>
      ) : (
        <div>
          {preview && (
            <div className="mb-4">
              <img
                src={preview}
                alt="Upload preview"
                className="max-w-full h-auto rounded-lg shadow-md"
              />
            </div>
          )}

          <button
            type="button"
            onClick={triggerFileInput}
            disabled={isUploading}
            className="px-4 py-2 bg-[#4b9aaa] text-white rounded-lg hover:bg-[#3a7888] transition-colors disabled:opacity-50 font-medium"
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span> Uploading...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>📷</span> {preview ? 'Change Image' : 'Add Image'}
              </span>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-2 text-red-500 text-sm">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}