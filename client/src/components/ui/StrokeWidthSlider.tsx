
interface StrokeWidthSliderProps {
  value: number;
  onChange: (width: number) => void;
  min?: number;
  max?: number;
}

export function StrokeWidthSlider({
  value,
  onChange,
  min = 1,
  max = 20,
}: StrokeWidthSliderProps) {
  return (
    <div className="stroke-width-slider">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider"
        title={`Espessura: ${value}px`}
      />
    </div>
  );
}