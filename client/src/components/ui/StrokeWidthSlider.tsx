import { useRef, useCallback } from 'react';

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
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const calculateValue = useCallback((clientX: number) => {
    if (!trackRef.current) return value;
    const rect = trackRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(min + percentage * (max - min));
  }, [min, max, value]);

  const handleStart = useCallback((clientX: number) => {
    isDragging.current = true;
    onChange(calculateValue(clientX));
  }, [calculateValue, onChange]);

  const handleMove = useCallback((clientX: number) => {
    if (isDragging.current) {
      onChange(calculateValue(clientX));
    }
  }, [calculateValue, onChange]);

  const handleEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleMouseUp = () => {
      handleEnd();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="stroke-width-slider">
      <div className="stroke-width-header">
        <span>Espessura</span>
        <span className="stroke-width-value">{value}px</span>
      </div>
      <div
        ref={trackRef}
        className="custom-slider-track"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="custom-slider-fill"
          style={{ width: `${percentage}%` }}
        />
        <div
          className="custom-slider-thumb"
          style={{ left: `${percentage}%` }}
        />
      </div>
    </div>
  );
}