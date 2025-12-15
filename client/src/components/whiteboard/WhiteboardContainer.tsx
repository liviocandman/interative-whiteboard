import { useState, useMemo, useRef, useCallback } from 'react';
import { Whiteboard } from './Whiteboard';
import { TopBar } from './TopBar';
import { LeftSidebar } from './LeftSidebar';
import { useWhiteboard } from '../../hooks/useWhiteboard';
import type { Tool, User } from '../../types';
import './WhiteboardContainer.css';

interface WhiteboardContainerProps {
  roomId?: string;
  currentUser: User | null;
  otherUsers: User[];
}

export function WhiteboardContainer({ roomId: propRoomId, currentUser, otherUsers }: WhiteboardContainerProps) {
  // State management
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Room ID from URL or prop
  const roomId = useMemo(() => {
    if (propRoomId) return propRoomId;
    const params = new URLSearchParams(window.location.search);
    return params.get('roomId') || `room-${Date.now()}`;
  }, [propRoomId]);

  // Log users for debugging
  console.log('WhiteboardContainer - currentUser:', currentUser);
  console.log('WhiteboardContainer - otherUsers:', otherUsers);

  // Hooks
  const {
    onPointerDown: originalOnPointerDown,
    onPointerMove,
    onPointerUp: originalOnPointerUp,
    resetBoard,
    isConnected,
  } = useWhiteboard({
    roomId,
    canvasRef,
    tool,
    color,
    lineWidth,
  });

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    originalOnPointerDown(e);
  }, [originalOnPointerDown]);

  const onPointerUp = useCallback(() => {
    originalOnPointerUp();
  }, [originalOnPointerUp]);

  // Handlers
  const handleToolChange = useCallback((newTool: Tool): void => {
    setTool(newTool);
  }, []);

  const handleExport = useCallback((): void => {
    if (!canvasRef.current) return;

    try {
      const link = document.createElement('a');
      link.download = `whiteboard-${roomId}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Falha ao exportar a imagem.');
    }
  }, [roomId]);

  // Combine current user and other users for TopBar
  const allUsers = currentUser ? [currentUser, ...otherUsers] : otherUsers;

  console.log('WhiteboardContainer - allUsers for TopBar:', allUsers);

  return (
    <div className="whiteboard-layout">
      {/* Top Navigation */}
      <TopBar
        roomId={roomId}
        currentUser={currentUser}
        users={allUsers}
        onExport={handleExport}
        isConnected={isConnected}
      />

      <div className="whiteboard-content">
        {/* Floating Tools Sidebar */}
        <LeftSidebar
          currentTool={tool}
          onToolChange={handleToolChange}
          color={color}
          onColorChange={setColor}
          lineWidth={lineWidth}
          onLineWidthChange={setLineWidth}
        onReset={resetBoard}
        />

        {/* Main Canvas Area */}
        <div className="canvas-container">
          <div className="canvas-wrapper">
            <Whiteboard
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              currentTool={tool}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
