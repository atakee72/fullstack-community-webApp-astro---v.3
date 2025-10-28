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
    <div className="space-y-3">
      {/* Available Tags and Custom Tags */}
      <div className="flex flex-wrap gap-2">
        {availableTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={`px-2 py-0.5 rounded-full text-xs font-medium transition-all transform hover:scale-105 ${
              selectedTags.includes(tag)
                ? 'bg-[#eccc6e] text-[#814256] ring-1 ring-[#eccc6e]/30'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
      <div className="flex gap-2">
        <input
          type="text"
          value={customTag}
          onChange={(e) => setCustomTag(e.target.value)}
          onKeyDown={addCustomTag}
          placeholder="Add custom tag (press Enter)"
          className="flex-1 px-2 py-1 rounded-lg border border-white/30 bg-white/80 text-gray-800 text-xs placeholder-gray-500 focus:outline-none focus:border-white focus:bg-white transition-all"
        />
      </div>
    </div>
  );
}