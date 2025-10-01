import { useState, useMemo, useRef, useCallback } from 'react';
import { Toolbar } from '../toolbar/Toolbar';
import { Whiteboard } from './Whiteboard';
import { useWhiteboard } from '../../hooks/useWhiteboard';
import { useHistory } from '../../hooks/useHistory';
import type { Tool, ToolbarSettings } from '../../types';

interface WhiteboardContainerProps {
  roomId: string
}

export function WhiteboardContainer({roomId}: WhiteboardContainerProps) {
  // State management
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [settings, setSettings] = useState<ToolbarSettings>({
    showGrid: false,
    snapToGrid: false,
    gridSize: 20,
  });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Room ID from URL
    roomId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('roomId') || `room-${Date.now()}`;
  }, []);

  // Hooks
  const {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    resetBoard,
    isConnected,
  } = useWhiteboard({
    roomId,
    canvasRef,
    tool,
    color,
    lineWidth,
  });

  const {
    canUndo,
    canRedo,
    undo,
    redo,
    saveState,
  } = useHistory(canvasRef);

  // Handlers
  const handleToolChange = useCallback((newTool: Tool): void => {
    // Save state before changing tools for undo/redo
    saveState();
    setTool(newTool);
    
    // Special handling for different tools
    if (newTool === 'bucket') {
      // Could show a tooltip or highlight areas
      console.log('Bucket tool selected - click on canvas to fill areas');
    }
  }, [saveState]);

  const handleExport = useCallback((): void => {
    if (!canvasRef.current) return;
    
    try {
      // Create download link
      const link = document.createElement('a');
      link.download = `whiteboard-${roomId}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Falha ao exportar a imagem. Tente novamente.');
    }
  }, [roomId]);

  const handleReset = useCallback((): void => {
    const confirmed = window.confirm(
      'Tem certeza que deseja limpar o quadro? Esta ação não pode ser desfeita.'
    );
    
    if (confirmed) {
      saveState(); // Save current state before reset for undo
      resetBoard();
    }
  }, [saveState, resetBoard]);

  // Mock current user (replace with real user data)
  const currentUser = {
    id: 'user-123',
    name: 'Designer',
    color: color,
    cursor: { x: 0, y: 0 },
    isDrawing: false,
    lastSeen: new Date(),
    isOnline: true,
  };

  return (
    <div className="enhanced-whiteboard-container">
      {/* Header */}
      <div className="whiteboard-header">
        <div className="room-info">
          <h1 className="room-title">Whiteboard - {roomId}</h1>
          <div className="room-stats">
            <span className="stat">👥 1 usuário</span>
            <span className="stat">🎨 {tool}</span>
          </div>
        </div>

        <div className="header-actions">
          <div className="export-info">
            <span className="export-hint">💡 Use Ctrl+S para salvar ou clique em 💾 para exportar</span>
          </div>
        </div>
      </div>

      {/*  Toolbar */}
      <Toolbar
        currentTool={tool}
        onToolChange={handleToolChange}
        strokeColor={color}
        onColorChange={setColor}
        lineWidth={lineWidth}
        onLineWidthChange={setLineWidth}
        onResetBoard={handleReset}
        isConnected={isConnected}
        currentUser={currentUser}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onExport={handleExport}
        settings={settings}
        onSettingsChange={setSettings}
      />

      {/* Main Canvas Area */}
      <div className="canvas-area">
        {/* Grid overlay if enabled */}
        {settings.showGrid && (
          <div 
            className="grid-overlay"
            style={{
              '--grid-size': `${settings.gridSize}px`
            } as React.CSSProperties}
          />
        )}

        {/* Main Canvas */}
        <div className="canvas-wrapper">
          <Whiteboard
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            currentTool={tool}
          />

          {/* Tool-specific overlays */}
          {tool === 'bucket' && (
            <div className="tool-overlay bucket-overlay">
              <div className="tool-hint">
                🪣 Clique em uma área para preencher com a cor selecionada
              </div>
            </div>
          )}

          
        </div>
      </div>

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-left">
          <span className="status-item">Ferramenta: {tool}</span>
          <span className="status-item">Cor: {color}</span>
          <span className="status-item">Espessura: {lineWidth}px</span>
        </div>
        
        <div className="status-right">
          <span className="status-item">
            {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
          </span>
          <span className="status-item">Sala: {roomId}</span>
        </div>
      </div>
    </div>
  );
}