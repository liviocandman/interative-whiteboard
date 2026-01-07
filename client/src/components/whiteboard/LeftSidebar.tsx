import { useState, useRef, useEffect, type ReactElement } from 'react';
import { StrokeWidthSlider } from '../ui/StrokeWidthSlider';
import { Icons } from '../ui/Icons';
import type { Tool } from '../../types';
import './LeftSidebar.css';

interface LeftSidebarProps {
  currentTool: Tool;
  onToolChange: (tool: Tool) => void;
  color: string;
  onColorChange: (color: string) => void;
  lineWidth: number;
  onLineWidthChange: (width: number) => void;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canDraw?: boolean; // Optional for backward compatibility
}

export function LeftSidebar({
  currentTool,
  onToolChange,
  color,
  onColorChange,
  lineWidth,
  onLineWidthChange,
  onReset,
  onUndo,
  onRedo,
  canDraw = true, // Default to true
}: LeftSidebarProps): ReactElement {
  const [isStrokeWidthOpen, setIsStrokeWidthOpen] = useState(false);
  const strokeWidthRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (strokeWidthRef.current && !strokeWidthRef.current.contains(event.target as Node)) {
        setIsStrokeWidthOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  const tools = [
    { id: 'pen', icon: Icons.Pen, label: 'Caneta' },
    { id: 'magicpen', icon: Icons.MagicWand, label: 'Caneta Mágica' },
    { id: 'eraser', icon: Icons.Eraser, label: 'Borracha' },
    { id: 'bucket', icon: Icons.Fill, label: 'Preencher' },
  ];

  return (
    <div className="floating-sidebar">
      {/* Warning icon if drawing is disabled */}
      {!canDraw && (
        <div
          style={{
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            borderRadius: 'var(--radius-md)',
            marginBottom: '0.5rem',
            cursor: 'help'
          }}
          title="Drawing is disabled in this room"
        >
          🔒
        </div>
      )}

      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = currentTool === tool.id;
        const isDisabled = !canDraw && tool.id !== 'select';

        return (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id as Tool)}
            className={`tool-btn ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
            title={isDisabled ? `${tool.label} (Disabled)` : tool.label}
            disabled={isDisabled}
            style={isDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          >
            <Icon />
          </button>
        );
      })}


      <div className="tool-divider" />

      {/* Color Picker */}
      <div className="color-picker" style={!canDraw ? { opacity: 0.5, pointerEvents: 'none' } : undefined}>
        <div
          className="color-picker-trigger"
          style={{ backgroundColor: color }}
          title={canDraw ? "Cor atual" : "Color picker (Disabled)"}
        />
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="color-picker-input"
          disabled={!canDraw}
        />
      </div>

      <div className="tool-divider" />

      {/* Stroke Width */}
      <div className="stroke-width-container" ref={strokeWidthRef} style={{ position: 'relative' }}>
        <button
          onClick={() => canDraw && setIsStrokeWidthOpen(!isStrokeWidthOpen)}
          className={`tool-btn ${isStrokeWidthOpen ? 'active' : ''}`}
          title={canDraw ? "Espessura do traço" : "Stroke width (Disabled)"}
          disabled={!canDraw}
          style={!canDraw ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
        >
          <Icons.StrokeWidth />
        </button>

        {isStrokeWidthOpen && canDraw && (
          <div className="stroke-width-popover" style={{
            position: 'absolute',
            left: '100%',
            top: '50%',
            transform: 'translateY(-50%)',
            marginLeft: '10px',
            backgroundColor: 'var(--bg-secondary)',
            padding: '10px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            border: '1px solid var(--border-color)'
          }}>
            <StrokeWidthSlider
              value={lineWidth}
              onChange={onLineWidthChange}
              min={1}
              max={50}
            />
          </div>
        )}
      </div>

      <div className="tool-divider" />

      {/* Undo/Redo Buttons */}
      <button
        onClick={onUndo}
        className="tool-btn"
        title={canDraw ? "Desfazer (Ctrl+Z)" : "Undo (Disabled)"}
        disabled={!canDraw}
        style={!canDraw ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
      >
        <Icons.Undo />
      </button>
      <button
        onClick={onRedo}
        className="tool-btn"
        title={canDraw ? "Refazer (Ctrl+Y)" : "Redo (Disabled)"}
        disabled={!canDraw}
        style={!canDraw ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
      >
        <Icons.Redo />
      </button>

      <div className="tool-divider" />

      {/* Reset Button */}
      <button
        onClick={onReset}
        className="tool-btn tool-btn--danger"
        title={canDraw ? "Limpar quadro" : "Clear board (Disabled)"}
        disabled={!canDraw}
        style={!canDraw ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
      >
        <Icons.Trash />
      </button>

    </div>
  );
}
