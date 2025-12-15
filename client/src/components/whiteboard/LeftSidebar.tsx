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
}

export function LeftSidebar({
  currentTool,
  onToolChange,
  color,
  onColorChange,
  lineWidth,
  onLineWidthChange,
  onReset,
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
    { id: 'eraser', icon: Icons.Eraser, label: 'Borracha' },
    { id: 'bucket', icon: Icons.Fill, label: 'Preencher' },
    { id: 'shapes', icon: Icons.Shapes, label: 'Formas' },
  ];

  return (
    <div className="floating-sidebar">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = currentTool === tool.id;

        return (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id as Tool)}
            className={`tool-btn ${isActive ? 'active' : ''}`}
            title={tool.label}
          >
            <Icon />
          </button>
        );
      })}


      <div className="tool-divider" />

      <div className="color-picker">
        <div
          className="color-picker-trigger"
          style={{ backgroundColor: color }}
          title="Cor atual"
        />
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="color-picker-input"
        />
      </div>

      <div className="tool-divider" />

      <div className="stroke-width-container" ref={strokeWidthRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setIsStrokeWidthOpen(!isStrokeWidthOpen)}
          className={`tool-btn ${isStrokeWidthOpen ? 'active' : ''}`}
          title="Espessura do traço"
        >
          <Icons.StrokeWidth />
        </button>

        {isStrokeWidthOpen && (
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

      <button
        onClick={onReset}
        className="tool-btn tool-btn--danger"
        title="Limpar quadro"
      >
        <Icons.Trash />
      </button>

    </div>
  );
}
