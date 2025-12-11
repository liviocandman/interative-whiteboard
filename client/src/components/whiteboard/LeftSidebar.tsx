import type { ReactElement } from 'react';
import { Icons } from '../ui/Icons';
import type { Tool } from '../../types';
import './LeftSidebar.css';

interface LeftSidebarProps {
  currentTool: Tool;
  onToolChange: (tool: Tool) => void;
  color: string;
  onColorChange: (color: string) => void;
}

export function LeftSidebar({ currentTool, onToolChange, color, onColorChange }: LeftSidebarProps): ReactElement {
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
    </div>
  );
}
