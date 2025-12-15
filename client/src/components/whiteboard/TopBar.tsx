import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Icons } from '../ui/Icons';
import type { User } from '../../types';
import './TopBar.css';

interface TopBarProps {
  roomId: string;
  currentUser: User | null;
  users: User[];
  onExport: () => void;
  isConnected: boolean;
}

export function TopBar({
  roomId,
  currentUser,
  users,
  onExport,
  isConnected,
}: TopBarProps): ReactElement {
  // Ensure unique users and keep current user highlighted
  const uniqueUsers = Array.from(
    new Map(users.map(user => [user.id, user])).values()
  );

  return (
    <div className="top-bar">
      {/* Left: Logo & Room Info */}
      <div className="top-bar__left">
        <Link to="/" className="logo-container" title="Voltar para a Home">
          <div className="logo-icon">
            <Icons.Grid />
          </div>
          <span className="logo-text">Whiteboard</span>
        </Link>
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

      {/* Right: Users & Share */}
      <div className="top-bar__right">
        <div className="user-avatar-group">
          {uniqueUsers.map(user => {
            const isCurrent = user.id === currentUser?.id;
            return (
            <div
              key={user.id}
              className={`user-avatar ${isCurrent ? 'user-avatar--current' : ''}`}
              style={{ backgroundColor: user.color }}
              title={isCurrent ? `${user.name} (Você)` : user.name}
            >
              {user.name?.charAt(0) || '?'}
            </div>
          );
          })}
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
