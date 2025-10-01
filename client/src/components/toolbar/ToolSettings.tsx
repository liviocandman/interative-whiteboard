import type { ReactElement } from "react";
import type { ToolbarSettings } from "../../types";

interface ToolSettingsProps {
  settings: ToolbarSettings;
  onSettingsChange?: (settings: ToolbarSettings) => void;
}

export function ToolSettings({ settings, onSettingsChange }: ToolSettingsProps): ReactElement {
  const updateSetting = <K extends keyof ToolbarSettings>(
    key: K,
    value: ToolbarSettings[K]
  ): void => {
    if (onSettingsChange) {
      onSettingsChange({ ...settings, [key]: value });
    }
  };

  return (
    <div className="tool-settings">
      <h3>Configurações do Canvas</h3>
      
      <div className="settings-grid">
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.showGrid}
              onChange={(e) => updateSetting('showGrid', e.target.checked)}
            />
            Mostrar grade
          </label>
        </div>
        
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.snapToGrid}
              onChange={(e) => updateSetting('snapToGrid', e.target.checked)}
              disabled={!settings.showGrid}
            />
            Ajustar à grade
          </label>
        </div>
        
        <div className="setting-item">
          <label>Tamanho da grade:</label>
          <input
            type="range"
            min="10"
            max="50"
            value={settings.gridSize}
            onChange={(e) => updateSetting('gridSize', Number(e.target.value))}
            disabled={!settings.showGrid}
          />
          <span>{settings.gridSize}px</span>
        </div>
        
      </div>
    </div>
  );
}