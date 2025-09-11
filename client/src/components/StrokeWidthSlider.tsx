import React from "react";

interface StrokeWidthSliderProps {
  value: number;
  onChange: (width: number) => void;
  min?: number;
  max?: number;
}

export default function StrokeWidthSlider({
  value,
  onChange,
  min = 1,
  max = 20,
}: StrokeWidthSliderProps) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        onChange(Number(e.target.value))
      }
    />
  );
}