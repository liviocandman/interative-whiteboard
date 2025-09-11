import ColorPicker from "./ColorPicker";
import StrokeWidthSlider from "./StrokeWidthSlider";
import type { Tool } from "../hooks/useWhiteboard";

interface ToolbarProps {
  currentTool: Tool;
  onToolChange: (tool: Tool) => void;
  strokeColor: string;
  onColorChange: (color: string) => void;
  lineWidth: number;
  onLineWidthChange: (width: number) => void;
}

const TOOL_OPTIONS: { id: Tool; label: string }[] = [
  { id: "pen", label: "✏️ Pen" },
  { id: "eraser", label: "🗑 Eraser" },
  { id: "bucket", label: "🩸 Fill" },
];

export default function Toolbar({
  currentTool,
  onToolChange,
  strokeColor,
  onColorChange,
  lineWidth,
  onLineWidthChange,
}: ToolbarProps) {
  return (
    <div style={{ display: "flex", gap: "1rem", padding: "0.5rem", background: "#eee" }}>
      {TOOL_OPTIONS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onToolChange(id)}
          className={currentTool === id ? "active" : ""}
          aria-pressed={currentTool === id}
        >
          {label}
        </button>
      ))}
      <ColorPicker value={strokeColor} onChange={onColorChange} />
      <StrokeWidthSlider value={lineWidth} onChange={onLineWidthChange} />
    </div>
  );
}
