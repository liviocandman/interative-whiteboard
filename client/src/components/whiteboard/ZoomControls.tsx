import { type ReactElement } from 'react';
import { Icons } from '../ui/Icons';
import type { ViewConfig } from '../../types';
import './ZoomControls.css';

interface ZoomControlsProps {
  viewConfig: ViewConfig;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}

export function ZoomControls({
  viewConfig,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}: ZoomControlsProps): ReactElement {
  return (
    <div className="zoom-controls-overlay">
      <button
        onClick={onZoomOut}
        onTouchEnd={(e) => { e.preventDefault(); onZoomOut(); }}
        className="tool-btn"
        title="Zoom Out"
      >
        <Icons.ZoomOut />
      </button>
      <span className="zoom-level">{Math.round(viewConfig.zoom * 100)}%</span>
      <button
        onClick={onZoomIn}
        onTouchEnd={(e) => { e.preventDefault(); onZoomIn(); }}
        className="tool-btn"
        title="Zoom In"
      >
        <Icons.ZoomIn />
      </button>
      <button
        onClick={onZoomReset}
        onTouchEnd={(e) => { e.preventDefault(); onZoomReset(); }}
        className="tool-btn"
        title="Reset Zoom"
      >
        <Icons.ZoomReset />
      </button>
    </div>
  );
}
