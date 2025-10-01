// client/src/components/whiteboard/Whiteboard.tsx
import { forwardRef, useEffect } from 'react';
import { drawingService } from '../../services/drawingService';
import type { Tool } from '../../types';

interface WhiteboardProps {
  onPointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: () => void;
  currentTool?: Tool;
}

export const Whiteboard = forwardRef<HTMLCanvasElement, WhiteboardProps>(
  ({ onPointerDown, onPointerMove, onPointerUp, currentTool = 'pen' }, ref) => {
    useEffect(() => {
      // Previne scroll em dispositivos móveis
      const preventDefault = (e: Event) => e.preventDefault();
      
      document.addEventListener('touchstart', preventDefault, { passive: false });
      document.addEventListener('touchend', preventDefault, { passive: false });
      document.addEventListener('touchmove', preventDefault, { passive: false });

      return () => {
        document.removeEventListener('touchstart', preventDefault);
        document.removeEventListener('touchend', preventDefault);
        document.removeEventListener('touchmove', preventDefault);
      };
    }, []);

    // Get cursor style based on current tool
    const cursorStyle = drawingService.getToolCursor(currentTool);

    return (
      <canvas
        ref={ref}
        className="whiteboard-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{
          touchAction: 'none',
          backgroundColor: '#fff',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: cursorStyle,
          width: window.innerWidth,
          height: window.innerHeight,
        }}
        aria-label="Quadro para desenhar"
        role="img"
      />
    );
  }
);

Whiteboard.displayName = 'Whiteboard';