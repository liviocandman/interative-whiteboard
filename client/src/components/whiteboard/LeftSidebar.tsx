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
  canDraw?: boolean;
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
  canDraw = true,
}: LeftSidebarProps): ReactElement {
  const [isStrokeWidthOpen, setIsStrokeWidthOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const strokeWidthRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Close popovers and menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (strokeWidthRef.current && !strokeWidthRef.current.contains(target)) {
        setIsStrokeWidthOpen(false);
      }
      if (colorPickerRef.current && !colorPickerRef.current.contains(target)) {
        setIsColorPickerOpen(false);
      }
    }

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const tools = [
    { id: 'pen', icon: Icons.Pen, label: 'Caneta' },
    { id: 'hand', icon: Icons.Hand, label: 'Mover' },
    { id: 'magicpen', icon: Icons.MagicWand, label: 'Caneta Mágica' },
    { id: 'eraser', icon: Icons.Eraser, label: 'Borracha' },
    { id: 'bucket', icon: Icons.Fill, label: 'Preencher' },
  ];

  const handleColorSelect = (c: string) => {
    onColorChange(c);
    setIsColorPickerOpen(false);
  };

  return (
    <div className={`floating-sidebar ${isMenuOpen ? 'menu-expanded' : ''}`}>
      {/* Menu Toggle */}
      <button
        className="menu-toggle-btn"
        onClick={(e) => {
          e.stopPropagation();
          setIsMenuOpen(!isMenuOpen);
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsMenuOpen(prev => !prev);
        }}
        title="Menu"
      >
        <Icons.Menu />
      </button>

      <div className="sidebar-content">
        {!canDraw && (
          <div className="disabled-warning" title="Drawing is disabled in this room">🔒</div>
        )}

        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = currentTool === tool.id;
          const isDisabled = !canDraw && tool.id !== 'select';

          const handleSelect = () => {
            if (!isDisabled) onToolChange(tool.id as Tool);
          };

          return (
            <button
              key={tool.id}
              onClick={handleSelect}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleSelect();
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
            onClick={() => canDraw && setIsColorPickerOpen(!isColorPickerOpen)}
            onTouchEnd={(e) => {
              e.preventDefault();
              if (canDraw) setIsColorPickerOpen(!isColorPickerOpen);
            }}
            title={canDraw ? "Selecionar cor" : "Color picker (Disabled)"}
            disabled={!canDraw}
          >
            <div className="color-picker-trigger" style={{ backgroundColor: color }} />
          </button>

          {isColorPickerOpen && canDraw && (
            <div className="color-picker-popover">
              <div className="color-swatches">
                {/* All colors in a single array for cleaner code */}
                {[
                  // Grays
                  '#000000', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#ffffff',
                  // Vibrant
                  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6',
                  // Purples & pinks
                  '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#84cc16', '#06b6d4',
                  // Earth tones
                  '#78350f', '#92400e', '#166534', '#1e40af', '#7c3aed', '#be185d',
                ].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-swatch ${color === c ? 'active' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => handleColorSelect(c)}
                    onTouchEnd={(e) => { e.preventDefault(); handleColorSelect(c); }}
                  />
                ))}
              </div>
              <div className="color-custom">
                <span>Personalizada:</span>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => onColorChange(e.target.value)}
                  className="color-custom-input-visible"
                />
              </div>
            </div>
          )}
        </div>

        <div className="tool-divider" />

        {/* Stroke Width */}
        <div className="stroke-width-container" ref={strokeWidthRef} style={{ position: 'relative' }}>
          <button
            onClick={() => canDraw && setIsStrokeWidthOpen(!isStrokeWidthOpen)}
            onTouchEnd={(e) => {
              e.preventDefault();
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
            <div className="stroke-width-popover">
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

        {/* Undo/Redo */}
        <button
          onClick={onUndo}
          onTouchEnd={(e) => { e.preventDefault(); onUndo(); }}
          className="tool-btn"
          title={canDraw ? "Desfazer (Ctrl+Z)" : "Undo (Disabled)"}
          disabled={!canDraw}
          style={!canDraw ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
        >
          <Icons.Undo />
        </button>
        <button
          onClick={onRedo}
          onTouchEnd={(e) => { e.preventDefault(); onRedo(); }}
          className="tool-btn"
          title={canDraw ? "Refazer (Ctrl+Y)" : "Redo (Disabled)"}
          disabled={!canDraw}
          style={!canDraw ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
        >
          <Icons.Redo />
        </button>

        <div className="tool-divider" />

        {/* Reset */}
        <button
          onClick={onReset}
          onTouchEnd={(e) => { e.preventDefault(); onReset(); }}
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
