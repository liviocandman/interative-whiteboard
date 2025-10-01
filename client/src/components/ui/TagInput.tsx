import { useState, type KeyboardEvent, type ReactElement } from 'react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  maxTags?: number;
  maxTagLength?: number;
}

export function TagInput({
  tags,
  onChange,
  suggestions = [],
  placeholder = 'Add tag...',
  maxTags = 10,
  maxTagLength = 20,
}: TagInputProps): ReactElement {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = suggestions.filter(
    suggestion => 
      !tags.includes(suggestion) &&
      suggestion.toLowerCase().includes(inputValue.toLowerCase())
  );

  const addTag = (tag: string): void => {
    const trimmedTag = tag.trim().toLowerCase();
    
    if (
      trimmedTag &&
      !tags.includes(trimmedTag) &&
      tags.length < maxTags &&
      trimmedTag.length <= maxTagLength
    ) {
      onChange([...tags, trimmedTag]);
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const removeTag = (tagToRemove: string): void => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string): void => {
    addTag(suggestion);
  };

  return (
    <div className="tag-input">
      <div className="tag-input-container">
        {/* Existing tags */}
        <div className="tags-list">
          {tags.map((tag, index) => (
            <div key={index} className="tag-item">
              <span className="tag-text">{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="tag-remove-btn"
                title={`Remover "${tag}"`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Input field */}
        {tags.length < maxTags && (
          <div className="tag-input-wrapper">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder={tags.length === 0 ? placeholder : ''}
              className="tag-input-field"
              maxLength={maxTagLength}
            />

            {/* Suggestions dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="tag-suggestions">
                {filteredSuggestions.slice(0, 5).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="tag-suggestion-item"
                  >
                    <span className="suggestion-text">{suggestion}</span>
                    <span className="suggestion-action">+</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info text */}
      <div className="tag-input-info">
        <span className="tag-count">
          {tags.length}/{maxTags} tags
        </span>
        {tags.length >= maxTags && (
          <span className="tag-limit-warning">
            Maximum limit of tags reached
          </span>
        )}
      </div>
    </div>
  );
}