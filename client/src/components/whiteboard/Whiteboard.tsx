// client/src/components/whiteboard/Whiteboard.tsx
import { forwardRef, useEffect, useMemo } from 'react';
import { drawingService } from '../../services/drawingService';
import type { Tool } from '../../types';
import type { RoomSettings } from '../../types/room';

interface WhiteboardProps {
  onPointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: () => void;
  currentTool?: Tool;
  settings?: RoomSettings;
}

// Canvas size presets
const CANVAS_SIZES = {
  small: { width: 800, height: 600 },
  medium: { width: 1200, height: 800 },
  large: { width: 1920, height: 1080 },
} as const;

export const Whiteboard = forwardRef<HTMLCanvasElement, WhiteboardProps>(
  ({ onPointerDown, onPointerMove, onPointerUp, currentTool = 'pen', settings }, ref) => {

    // Calculate canvas dimensions based on settings
    const canvasDimensions = useMemo(() => {
      if (!settings) {
        return {
          width: window.innerWidth,
          height: window.innerHeight,
        };
      }

      if (settings.canvasSize === 'custom') {
        return {
          width: settings.customWidth || 1200,
          height: settings.customHeight || 800,
        };
      }

      // Use preset size
      return CANVAS_SIZES[settings.canvasSize] || CANVAS_SIZES.large;
    }, [settings]);

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
        style={{
          touchAction: 'none',
          backgroundColor: settings?.backgroundColor || '#ffffff',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: cursorStyle,
          width: canvasDimensions.width,
          height: canvasDimensions.height,
          maxWidth: '100%',
          maxHeight: '100vh',
        }}
        width={canvasDimensions.width}
        height={canvasDimensions.height}
        aria-label="Quadro para desenhar"
        role="img"
      />
    );
  }
);

Whiteboard.displayName = 'Whiteboard';