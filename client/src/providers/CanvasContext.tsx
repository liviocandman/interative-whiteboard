import { CanvasContext } from "../hooks/useCanvasContext";
import { useCanvas } from "../hooks/useCanvas";

export const CanvasProvider: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => {
  
  const canvas = useCanvas();

  return (
    <div style={style}>
      <CanvasContext.Provider value={canvas}>
        {children}
      </CanvasContext.Provider>
    </div>
  );
};