import { useCanvasContext } from "../hooks/useCanvasContext";

export default function StrokeWidthSlider() {
  const { lineWidth, setLineWidth } = useCanvasContext();
  return (
    <input
      type="range"
      min={1}
      max={20}
      value={lineWidth}
      onChange={(e) => setLineWidth(Number(e.target.value))}
    />
  );
}