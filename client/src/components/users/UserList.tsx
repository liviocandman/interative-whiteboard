import type { ReactElement } from 'react';
import type { User } from '../../types';

interface UserListProps {
  currentUser: User | null;
  otherUsers: User[];
}

export function UserList({ currentUser, otherUsers }: UserListProps): ReactElement {
  const allUsers = currentUser ? [currentUser, ...otherUsers] : otherUsers;

  return (
    <div className="user-list">
      <div className="user-list-header">
        <span className="user-count">{allUsers.length} usuários</span>
      </div>
      
      <div className="user-list-items">
        {allUsers.map(user => (
          <div key={user.id} className="user-item">
            <div 
              className="user-avatar"
              style={{ backgroundColor: user.color }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            
            <div className="user-info">
              <span className="user-name">
                {user.name}
                {user.id === currentUser?.id && ' (você)'}
              </span>
              
              <div className="user-status">
                <span className={`status-dot ${user.isOnline ? 'online' : 'offline'}`} />
                {user.isDrawing && <span className="drawing-indicator">✏️</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}