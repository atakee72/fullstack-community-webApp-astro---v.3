import React, { useState } from 'react';

interface TagSelectorProps {
  onTagsChange: (tags: string[]) => void;
  selectedTags: string[];
}

const availableTags = [
  'General', 'Events', 'Help', 'News', 'Discussion',
  'Announcement', 'Question', 'Recommendation', 'Social',
  'Sports', 'Food', 'Culture', 'Education', 'Business',
  'Technology', 'Health', 'Safety', 'Environment', 'Politics'
];

export default function TagSelector({ onTagsChange, selectedTags }: TagSelectorProps) {
  const [customTag, setCustomTag] = useState('');

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const addCustomTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && customTag.trim()) {
      e.preventDefault();
      const newTag = customTag.trim();
      if (!selectedTags.includes(newTag)) {
        onTagsChange([...selectedTags, newTag]);
      }
      setCustomTag('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Available Tags */}
      <div className="flex flex-wrap gap-2">
        {availableTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all transform hover:scale-105 ${
              selectedTags.includes(tag)
                ? 'bg-[#eccc6e] text-[#814256] ring-2 ring-white'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            {selectedTags.includes(tag) ? '✓ ' : '+ '}
            {tag}
          </button>
        ))}
      </div>

      {/* Custom Tag Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customTag}
          onChange={(e) => setCustomTag(e.target.value)}
          onKeyDown={addCustomTag}
          placeholder="Add custom tag (press Enter)"
          className="flex-1 px-3 py-2 rounded-lg border-2 border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:border-[#eccc6e] focus:bg-white/20 transition-all"
        />
      </div>

      {/* Selected Tags Display */}
      {selectedTags.length > 0 && (
        <div className="bg-white/10 rounded-lg p-3">
          <p className="text-white/80 text-sm mb-2">Selected tags:</p>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 bg-[#eccc6e] text-[#814256] rounded-full text-sm font-medium"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className="hover:text-red-600 transition-colors"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}