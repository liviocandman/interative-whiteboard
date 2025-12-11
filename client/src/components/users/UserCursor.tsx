import type { ReactElement } from 'react';
import type { User } from '../../types';

interface UserCursorProps {
  user: User;
  canvasRect: DOMRect | null;
}

export function UserCursor({ user, canvasRect }: UserCursorProps): ReactElement | null {
  if (!canvasRect) return null;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: canvasRect.left + user.cursor.x - 12,
    top: canvasRect.top + user.cursor.y - 12,
    pointerEvents: 'none',
    zIndex: 1000,
    transition: 'all 0.1s ease-out',
  };

  return (
    <div className="user-cursor" style={style}>
      <div
        className="cursor-pointer"
        style={{
          backgroundColor: user.color,
          boxShadow: user.isDrawing ? `0 0 10px ${user.color}` : 'none'
        }}
      />
      <div className="cursor-label" style={{ color: user.color }}>
        {user.name}
        {user.isDrawing && <span className="drawing-indicator">✏️</span>}
      </div>
    </div>
  );
}