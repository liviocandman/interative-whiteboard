// client/src/components/whiteboard/Whiteboard.tsx
import { useEffect } from 'react';
import { drawingService } from '../../services/drawingService';
import type { Tool } from '../../types';
import type { RoomSettings } from '../../types/room';

interface WhiteboardProps {
  onPointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onWheel?: (e: React.WheelEvent<HTMLCanvasElement>) => void;
  onTouchStart?: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  onTouchMove?: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  onTouchEnd?: () => void;
  currentTool?: Tool;
  settings?: RoomSettings;
  isPanning?: boolean;
  ref: React.RefObject<HTMLCanvasElement | null>;
}

export function Whiteboard({
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheel,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  currentTool = 'pen',
  settings,
  isPanning = false,
  ref
}: WhiteboardProps) {


  useEffect(() => {
    // Previne scroll em dispositivos móveis, exceto na barra lateral
    const preventDefault = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      // Permite que eventos de toque funcionem nos containers da barra lateral
      if (
        target.closest('.floating-sidebar') ||
        target.closest('.sidebar-content') ||
        target.closest('.stroke-width-popover') ||
        target.closest('.color-picker-popover') ||
        target.closest('.top-bar') ||
        target.closest('.navbar') ||
        target.closest('.btn') ||
        target.closest('button') ||
        target.closest('a')
      ) {
        return;
      }
      e.preventDefault();
    };

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
