import type { ReactElement } from 'react';
import { Icons } from '../ui/Icons';
import type { User } from '../../types';
import './TopBar.css';

interface TopBarProps {
  roomId: string;
  currentUser: User | null;
  users: User[];
  onExport: () => void;
  isConnected: boolean;
  onReset: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function TopBar({
  roomId,
  currentUser,
  users,
  onExport,
  isConnected,
  onReset,
  onUndo,
  onRedo
}: TopBarProps): ReactElement {
  // Filter out current user from the list
  const otherUsers = users.filter(user => user.id !== currentUser?.id);

  return (
    <div className="top-bar">
      {/* Left: Logo & Room Info */}
      <div className="top-bar__left">
        <div className="logo-container">
          <div className="logo-icon">
            <Icons.Grid />
          </div>
          <span className="logo-text">Whiteboard</span>
        </div>
        <div className="room-info">
          <div className="room-info__content">
            <h1 className="room-info__title">
              {roomId}
            </h1>
            <div className="room-info__status">
              <div className={`status-indicator ${isConnected ? 'status-indicator--connected' : 'status-indicator--offline'}`} />
              <span className="status-text">
                {isConnected ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Center: Actions */}
      <div className="top-bar__center">
        <button
          onClick={onUndo}
          className="action-btn"
          title="Desfazer"
        >
          <Icons.Undo />
        </button>
        <button
          onClick={onRedo}
          className="action-btn"
          title="Refazer"
        >
          <Icons.Redo />
        </button>
        <div className="action-divider" />
        <button
          onClick={onReset}
          className="action-btn action-btn--danger"
          title="Limpar tudo"
        >
          <Icons.Trash />
        </button>
      </div>

      {/* Right: Users & Share */}
      <div className="top-bar__right">
        <div className="user-avatar-group">
          {otherUsers.map(user => (
            <div
              key={user.id}
              className="user-avatar"
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              {user.name.charAt(0)}
            </div>
          ))}
          {currentUser && (
            <div
              className="user-avatar user-avatar--current"
              style={{ backgroundColor: currentUser.color }}
              title={`${currentUser.name} (Você)`}
            >
              {currentUser.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="top-bar__actions">
          <button onClick={onExport} className="btn btn-secondary text-small">
            <Icons.Download />
          </button>
          <button className="btn btn-primary text-small">
            Compartilhar
          </button>
        </div>
      </div>
    </div>
  );
}
