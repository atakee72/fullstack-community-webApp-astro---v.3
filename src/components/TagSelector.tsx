import React, { useState } from 'react';

interface TagSelectorProps {
  onTagsChange: (tags: string[]) => void;
  selectedTags: string[];
}

const availableTags = [
  'Events', 'Help', 'News',
  'Sports', 'Food', 'Culture', 'Education', 'Business',
  'Technology', 'Health', 'Safety', 'Environment', 'Politics'
];

export default function TagSelector({ onTagsChange, selectedTags }: TagSelectorProps) {
  const [customTag, setCustomTag] = useState('');

  const MAX_TAGS = 5;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else if (selectedTags.length < MAX_TAGS) {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const addCustomTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && customTag.trim()) {
      e.preventDefault();
      const newTag = customTag.trim();
      if (!selectedTags.includes(newTag) && selectedTags.length < MAX_TAGS) {
        onTagsChange([...selectedTags, newTag]);
      }
      setCustomTag('');
    }
  };

  const isAtLimit = selectedTags.length >= MAX_TAGS;

  return (
    <div className="space-y-3">
      {/* Available Tags and Custom Tags */}
      <div className="flex flex-wrap gap-2">
        {availableTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            disabled={isAtLimit && !selectedTags.includes(tag)}
            className={`px-2 py-0.5 rounded-full text-xs font-medium transition-all transform ${
              selectedTags.includes(tag)
                ? 'bg-[#eccc6e] text-[#814256] ring-1 ring-[#eccc6e]/30 hover:scale-105'
                : isAtLimit
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105'
            }`}
          >
            {selectedTags.includes(tag) ? '✓ ' : '+ '}
            {tag}
          </button>
        ))}

        {/* Show custom tags that aren't in availableTags */}
        {selectedTags
          .filter(tag => !availableTags.includes(tag))
          .map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className="px-2 py-0.5 rounded-full text-xs font-medium transition-all transform hover:scale-105 bg-[#eccc6e] text-[#814256] ring-1 ring-[#eccc6e]/30"
            >
              ✓ {tag}
              <span className="ml-1 hover:text-red-600">✕</span>
            </button>
          ))}
      </div>

      {/* Custom Tag Input */}
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={customTag}
          onChange={(e) => setCustomTag(e.target.value)}
          onKeyDown={addCustomTag}
          disabled={isAtLimit}
          placeholder={isAtLimit ? 'Max 5 tags reached' : 'Add custom tag (press Enter)'}
          className={`flex-1 px-2 py-1 rounded-lg border text-xs transition-all ${
            isAtLimit
              ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'border-white/30 bg-white/80 text-gray-800 placeholder-gray-500 focus:outline-none focus:border-white focus:bg-white'
          }`}
        />
        <span className="text-xs text-white/70">{selectedTags.length}/{MAX_TAGS}</span>
      </div>
    </div>
  );
}