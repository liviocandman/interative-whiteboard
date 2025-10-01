interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="color-picker">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="color-input"
        title="Escolher cor"
      />
      <div 
        className="color-preview" 
        style={{ backgroundColor: value }}
        aria-hidden="true"
      />
    </div>
  );
}
