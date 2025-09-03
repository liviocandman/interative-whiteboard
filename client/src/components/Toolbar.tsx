import ColorPicker from "./ColorPicker";
import StrokeWidthSlider from "./StrokeWidthSlider";
import { useCanvasContext } from "../hooks/useCanvasContext";

const tools = ["pen", "eraser", "bucket"] as const;

export default function Toolbar() {
  const { currentTool, setCurrentTool } = useCanvasContext();

  return (
    <div style={{ display: "flex", gap: "1rem", padding: "0.5rem", background: "#eee" }}>
      {tools.map((tool) => (
        <button
          key={tool}
          onClick={() => setCurrentTool(tool)}
          className={currentTool === tool ? "active" : ""}
        >
          {tool}
        </button>
      ))}
      <ColorPicker />
      <StrokeWidthSlider />
    </div>
  );
}
