import React, { forwardRef } from "react";
export interface WhiteboardProps {
  onPointerDown: React.PointerEventHandler<HTMLCanvasElement>;
  onPointerMove: React.PointerEventHandler<HTMLCanvasElement>;
  onPointerUp: React.PointerEventHandler<HTMLCanvasElement>;
}

const Whiteboard = forwardRef<HTMLCanvasElement, WhiteboardProps>(
  ({ onPointerDown, onPointerMove, onPointerUp }, ref) => (
    <canvas
      ref={ref}
      style={{
        touchAction: "none",
        backgroundColor: "#fff",
        border: "1px solid #ccc",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      aria-label="Drawing Canvas"
    />
  )
);

export default Whiteboard;
