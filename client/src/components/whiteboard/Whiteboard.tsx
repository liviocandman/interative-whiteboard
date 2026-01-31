// client/src/components/whiteboard/Whiteboard.tsx
import { forwardRef, useEffect } from 'react';
import { drawingService } from '../../services/drawingService';
import type { Tool } from '../../types';
import type { RoomSettings } from '../../types/room';

interface WhiteboardProps {
  onPointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: () => void;
  onWheel?: (e: React.WheelEvent<HTMLCanvasElement>) => void;
  onTouchStart?: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  onTouchMove?: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  onTouchEnd?: () => void;
  currentTool?: Tool;
  settings?: RoomSettings;
  isPanning?: boolean;
}
export const Whiteboard = forwardRef<HTMLCanvasElement, WhiteboardProps>(
  ({
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    currentTool = 'pen',
    settings,
    isPanning = false
  }, ref) => {


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
    const cursorStyle = drawingService.getToolCursor(currentTool, isPanning);

    // Apply grid CSS class conditionally
    const canvasClassName = `whiteboard-canvas ${settings?.enableGrid ? 'grid-enabled' : ''
      }`;

    return (
      <canvas
        ref={ref}
        className={canvasClassName}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          touchAction: 'none',
          backgroundColor: settings?.backgroundColor || '#ffffff',
          cursor: cursorStyle,
        }}
        aria-label="Quadro para desenhar"
        role="img"
      />
    );

  }
);

Whiteboard.displayName = 'Whiteboard'; 
