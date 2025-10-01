import type { ReactElement } from 'react'
import type { Tool, ToolConfig } from "../../types";
import { Button } from "../ui/Button";

interface ToolGroupProps {
  title: string;
  tools: ToolConfig[];
  currentTool: Tool;
  onToolChange: (tool: Tool) => void;
}

export function ToolGroup({ title, tools, currentTool, onToolChange }: ToolGroupProps): ReactElement {
  return (
    <div className="tool-group">
      <div className="tool-group-header">
        <span className="tool-group-title">{title}</span>
      </div>
      
      <div className="tool-buttons">
        {tools.map((tool) => (
          <Button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            variant={currentTool === tool.id ? 'active' : 'default'}
            title={`${tool.name} - ${tool.description}`}
            aria-label={tool.name}
            aria-pressed={currentTool === tool.id}
            className="tool-button"
          >
            <span className="tool-icon">{tool.icon}</span>
            <span className="tool-label">{tool.name}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
