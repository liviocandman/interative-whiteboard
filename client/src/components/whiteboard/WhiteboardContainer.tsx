import { useState, useMemo, useRef, useCallback } from 'react';
import { Whiteboard } from './Whiteboard';
import { TopBar } from './TopBar';
import { LeftSidebar } from './LeftSidebar';
import { ZoomControls } from './ZoomControls';
import { useWhiteboard } from '../../hooks/useWhiteboard';
import type { Tool, User } from '../../types';
import type { Room, RoomSettings } from '../../types/room';
import './WhiteboardContainer.css';

// Default settings if room fetch fails
const DEFAULT_SETTINGS: RoomSettings = {
  allowDrawing: true,
  allowChat: false,
  allowExport: true,
  requireApproval: false,
  backgroundColor: '#ffffff',
  canvasSize: 'large',
  enableGrid: false,
  enableRulers: false,
  autoSave: true,
  historyLimit: 50,
};

interface WhiteboardContainerProps {
  roomId?: string;
  currentUser: User | null;
  otherUsers: User[];
  room: Room | null;
  roomError?: string | null;
}

export function WhiteboardContainer({
  roomId: propRoomId,
  currentUser,
  otherUsers,
  room,
  roomError,
}: WhiteboardContainerProps) {
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

  // Get settings from room or use defaults
  const settings = room?.settings || DEFAULT_SETTINGS;

  // Permission checks
  const canDraw = useMemo(() => {
    if (!settings.allowDrawing) {
      // If drawing is disabled, only the owner can draw
      if (!currentUser || !room) return false;
      return currentUser.id === room.createdBy.id;
    }
    return true;
  }, [settings.allowDrawing, currentUser, room]);

  const canExport = settings.allowExport;

  // Log users for debugging
  console.log('WhiteboardContainer - currentUser:', currentUser);
  console.log('WhiteboardContainer - otherUsers:', otherUsers);
  console.log('WhiteboardContainer - room:', room);
  console.log('WhiteboardContainer - canDraw:', canDraw);
  console.log('WhiteboardContainer - canExport:', canExport);

  // Hooks
  const {
    onPointerDown: originalOnPointerDown,
    onPointerMove,
    onPointerUp: originalOnPointerUp,
    resetBoard,
    undo,
    redo,
    isConnected,
    viewConfig,
    zoomIn,
    zoomOut,
    zoomReset,
    onWheel,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    isPanning,
  } = useWhiteboard({
    roomId,
    canvasRef,
    tool: canDraw ? tool : 'select', // Force select tool if can't draw
    color,
    lineWidth,
  });

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    originalOnPointerDown(e);
  }, [originalOnPointerDown]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    originalOnPointerUp(e);
  }, [originalOnPointerUp]);

  // Handlers
  const handleToolChange = useCallback((newTool: Tool): void => {
    if (!canDraw && newTool !== 'select') {
      alert('Drawing is disabled in this room');
      return;
    }
    setTool(newTool);
  }, [canDraw]);

  const handleExport = useCallback((): void => {
    if (!canExport) {
      alert('Export is disabled in this room');
      return;
    }

    if (!canvasRef.current) return;

    try {
      const link = document.createElement('a');
      link.download = `whiteboard-${roomId}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export image.');
    }
  }, [roomId, canExport]);

  // Combine current user and other users for TopBar
  const allUsers = currentUser ? [currentUser, ...otherUsers] : otherUsers;

  console.log('WhiteboardContainer - allUsers for TopBar:', allUsers);

  return (
    <div className="whiteboard-layout">
      {/* Error banner if room fetch failed */}
      {roomError && (
        <div className="error-banner">
          ⚠️ {roomError} - Using default settings
        </div>
      )}

      {/* Top Navigation */}
      <TopBar
        roomId={roomId}
        currentUser={currentUser}
        users={allUsers}
        onExport={handleExport}
        isConnected={isConnected}
        canExport={canExport}
      />

      <div className="whiteboard-content">
        <LeftSidebar
          currentTool={tool}
          onToolChange={handleToolChange}
          color={color}
          onColorChange={setColor}
          lineWidth={lineWidth}
          onLineWidthChange={setLineWidth}
          onReset={resetBoard}
          onUndo={undo}
          onRedo={redo}
          canDraw={canDraw}
        />

        {/* Floating Zoom Controls */}
        <ZoomControls
          viewConfig={viewConfig}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onZoomReset={zoomReset}
        />

        {/* Main Canvas Area */}
        <div className="canvas-container">
          <div className="canvas-wrapper">
            <Whiteboard
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onWheel={onWheel}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              currentTool={tool}
              settings={settings}
              isPanning={isPanning}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
