import { useState, type ReactElement } from 'react';
import { ColorPicker } from '../ui/ColorPicker';
import { StrokeWidthSlider } from '../ui/StrokeWidthSlider';
import { Button } from '../ui/Button';
import { ToolGroup } from './ToolGroup';
import { ToolSettings } from './ToolSettings';
import { drawingService } from '../../services/drawingService';
import type { Tool, User, ToolbarSettings, ToolConfig } from '../../types';

interface ToolbarProps {
  currentTool: Tool;
  onToolChange: (tool: Tool) => void;
  strokeColor: string;
  onColorChange: (color: string) => void;
  lineWidth: number;
  onLineWidthChange: (width: number) => void;
  onResetBoard: () => void;
  isConnected: boolean;
  currentUser: User | null;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onExport?: () => void;
  settings?: ToolbarSettings;
  onSettingsChange?: (settings: ToolbarSettings) => void;
}

const DRAWING_TOOLS: ToolConfig[] = [
  {
    id: 'pen',
    name: 'Caneta',
    icon: '✏️',
    description: 'Desenho livre',
    cursor: 'crosshair',
    category: 'drawing',
  },
  {
    id: 'eraser',
    name: 'Borracha',
    icon: '🗑️',
    description: 'Apagar desenhos',
    cursor: 'grab',
    category: 'drawing',
  },
  {
    id: 'bucket',
    name: 'Balde',
    icon: '🖌',
    description: 'Preencher área',
    cursor: 'crosshair',
    category: 'drawing',
  },
];

export function Toolbar({
  currentTool,
  onToolChange,
  strokeColor,
  onColorChange,
  lineWidth,
  onLineWidthChange,
  onResetBoard,
  isConnected,
  currentUser,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onExport,
  settings,
  onSettingsChange,
}: ToolbarProps): ReactElement {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleToolChange = (tool: Tool): void => {
    onToolChange(tool);
    
    // Change cursor based on tool
    const cursor = drawingService.getToolCursor(tool);
    document.body.style.cursor = cursor;
  };

  const defaultSettings: ToolbarSettings = {
    showGrid: false,
    snapToGrid: false,
    gridSize: 20,
    ...settings,
  };

  const currentToolConfig = [...DRAWING_TOOLS,]
    .find(tool => tool.id === currentTool);

  return (
    <div className="enhanced-toolbar">
      {/* Main toolbar */}
      <div className="toolbar-main">
        {/* User info */}
        <div className="toolbar-section user-section">
          {currentUser && (
            <div className="current-user-info">
              <div 
                className="user-avatar small"
                style={{ backgroundColor: currentUser.color }}
              >
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <span className="user-name-small">{currentUser.name}</span>
            </div>
          )}
          
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            <div className="status-indicator" />
            <span className="status-text">
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Tool groups */}
        <div className="toolbar-section tools-section">
          <ToolGroup
            title="Desenho"
            tools={DRAWING_TOOLS}
            currentTool={currentTool}
            onToolChange={handleToolChange}
          />
          
        </div>

        {/* Current tool info */}
        <div className="toolbar-section tool-info">
          {currentToolConfig && (
            <div className="current-tool-display">
              <span className="tool-icon">{currentToolConfig.icon}</span>
              <div className="tool-details">
                <span className="tool-name">{currentToolConfig.name}</span>
                <span className="tool-description">{currentToolConfig.description}</span>
              </div>
            </div>
          )}
        </div>

        {/* Color and brush settings */}
        <div className="toolbar-section brush-section">
          <div className="setting-group">
            <label>Cor:</label>
            <ColorPicker value={strokeColor} onChange={onColorChange} />
          </div>
          
          <div className="setting-group">
            <label>Espessura:</label>
            <StrokeWidthSlider
              value={lineWidth}
              onChange={onLineWidthChange}
              min={1}
              max={50}
            />
            <span className="value-display">{lineWidth}px</span>
          </div>
        </div>

        {/* History controls */}
        <div className="toolbar-section history-section">
          <Button
            onClick={onUndo}
            disabled={!canUndo}
            title="Desfazer (Ctrl+Z)"
            variant="default"
            className="icon-button"
          >
            ↶
          </Button>
          
          <Button
            onClick={onRedo}
            disabled={!canRedo}
            title="Refazer (Ctrl+Y)"
            variant="default"
            className="icon-button"
          >
            ↷
          </Button>
        </div>

        {/* Action buttons */}
        <div className="toolbar-section actions-section">
          <Button
            onClick={onExport}
            title="Exportar imagem"
            variant="default"
            className="icon-button"
          >
            💾
          </Button>
          
          <Button
            onClick={onResetBoard}
            title="Limpar quadro"
            variant="danger"
            className="icon-button"
          >
            🗑️
          </Button>
          
          <Button
            onClick={() => setShowAdvanced(!showAdvanced)}
            title="Configurações avançadas"
            variant={showAdvanced ? 'active' : 'default'}
            className="icon-button"
          >
            ⚙️
          </Button>
        </div>
      </div>

      {/* Advanced settings panel */}
      {showAdvanced && (
        <div className="toolbar-advanced">
          <ToolSettings
            settings={defaultSettings}
            onSettingsChange={onSettingsChange}
          />
        </div>
      )}
    </div>
  );
}