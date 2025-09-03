import { useCanvasContext } from "../hooks/useCanvasContext";

export default function ColorPicker() {
  const { strokeColor, setStrokeColor } = useCanvasContext();
  return (
    <input
      type="color"
      value={strokeColor}
      onChange={(e) => setStrokeColor(e.target.value)}
    />
  );
}