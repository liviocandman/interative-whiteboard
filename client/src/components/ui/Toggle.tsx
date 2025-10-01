import React from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'medium',
  className = '',
}: ToggleProps) {
  const toggleId = React.useId();

  return (
    <div className={`toggle-wrapper ${size} ${disabled ? 'disabled' : ''} ${className}`}>
      <div className="toggle-container">
        <input
          type="checkbox"
          id={toggleId}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="toggle-input"
        />
        
        <label htmlFor={toggleId} className="toggle-label">
          <div className={`toggle-track ${checked ? 'active' : ''}`}>
            <div className="toggle-thumb" />
          </div>
        </label>
      </div>

      {label && (
        <label htmlFor={toggleId} className="toggle-text">
          {label}
        </label>
      )}
    </div>
  );
}