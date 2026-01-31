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
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const strokeWidthRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const customColorRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (strokeWidthRef.current && !strokeWidthRef.current.contains(event.target as Node)) {
        setIsStrokeWidthOpen(false);
      }
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setIsColorPickerOpen(false);
      }
    }

    // Support both mouse and touch events for mobile
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const tools = [
    { id: 'pen', icon: Icons.Pen, label: 'Caneta' },
    { id: 'magicpen', icon: Icons.MagicWand, label: 'Caneta Mágica' },
    { id: 'eraser', icon: Icons.Eraser, label: 'Borracha' },
    { id: 'bucket', icon: Icons.Fill, label: 'Preencher' },
  ];

  return (
    <div className={`floating-sidebar ${isMenuOpen ? 'menu-expanded' : ''}`}>
      {/* Menu Toggle - Visible only on mobile < 420px via CSS */}
      <button
        className="menu-toggle-btn"
        onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsMenuOpen(!isMenuOpen);
        }}
        title="Menu"
      >
        <Icons.Menu />
      </button>

      <div className="sidebar-content">
        {/* Warning icon if drawing is disabled */}
        {!canDraw && (
          <div
            className="disabled-warning"
            title="Drawing is disabled in this room"
          >
            🔒
          </div>
        )}

        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = currentTool === tool.id;
          const isDisabled = !canDraw && tool.id !== 'select';

          const handleSelect = (e: React.MouseEvent | React.TouchEvent) => {
            e.stopPropagation();
            if (!isDisabled) onToolChange(tool.id as Tool);
          };

          return (
            <button
              key={tool.id}
              onClick={handleSelect}
              onTouchStart={(e) => {
                e.preventDefault();
                handleSelect(e);
              }}
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
        <div
          className="color-picker-container"
          ref={colorPickerRef}
          style={!canDraw ? { opacity: 0.5, pointerEvents: 'none' } : { position: 'relative' }}
        >
          <button
            className={`tool-btn color-picker-btn ${isColorPickerOpen ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); if (canDraw) setIsColorPickerOpen(!isColorPickerOpen); }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (canDraw) setIsColorPickerOpen(!isColorPickerOpen);
            }}
            title={canDraw ? "Selecionar cor" : "Color picker (Disabled)"}
            disabled={!canDraw}
          >
            <div className="color-picker-trigger" style={{ backgroundColor: color }} />
          </button>

          {isColorPickerOpen && canDraw && (
            <div className="color-picker-popover" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
              <div className="color-swatches">
                {['#000000', '#ffffff', '#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'].map((c) => (
                  <button
                    key={c}
                    className={`color-swatch ${color === c ? 'active' : ''}`}
                    style={{ backgroundColor: c, border: c === '#ffffff' ? '1px solid #ccc' : 'none' }}
                    onClick={() => { onColorChange(c); setIsColorPickerOpen(false); }}
                    onTouchStart={(e) => { e.preventDefault(); onColorChange(c); setIsColorPickerOpen(false); }}
                  />
                ))}
              </div>
              <div
                className="color-custom"
                onClick={() => customColorRef.current?.click()}
                onTouchStart={(e) => {
                  e.preventDefault();
                  customColorRef.current?.click();
                }}
              >
                <span>Personalizada:</span>
                <div className="color-custom-preview" style={{ backgroundColor: color }}>
                  <input
                    ref={customColorRef}
                    type="color"
                    value={color}
                    onChange={(e) => onColorChange(e.target.value)}
                    className="color-custom-input"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="tool-divider" />

        {/* Stroke Width */}
        <div className="stroke-width-container" ref={strokeWidthRef} style={{ position: 'relative' }}>
          <button
            onClick={(e) => { e.stopPropagation(); if (canDraw) setIsStrokeWidthOpen(!isStrokeWidthOpen); }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (canDraw) setIsStrokeWidthOpen(!isStrokeWidthOpen);
            }}
            className={`tool-btn ${isStrokeWidthOpen ? 'active' : ''}`}
            title={canDraw ? "Espessura do traço" : "Stroke width (Disabled)"}
            disabled={!canDraw}
            style={!canDraw ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          >
            <Icons.StrokeWidth />
          </button>

          {isStrokeWidthOpen && canDraw && (
            <div className="stroke-width-popover" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
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
          onClick={(e) => { e.stopPropagation(); onUndo(); }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (canDraw) onUndo();
          }}
          className="tool-btn"
          title={canDraw ? "Desfazer (Ctrl+Z)" : "Undo (Disabled)"}
          disabled={!canDraw}
          style={!canDraw ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
        >
          <Icons.Undo />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRedo(); }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (canDraw) onRedo();
          }}
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
          onClick={(e) => { e.stopPropagation(); onReset(); }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (canDraw) onReset();
          }}
          className="tool-btn tool-btn--danger"
          title={canDraw ? "Limpar quadro" : "Clear board (Disabled)"}
          disabled={!canDraw}
          style={!canDraw ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
        >
          <Icons.Trash />
        </button>
      </div>
    </div>
  );
}
