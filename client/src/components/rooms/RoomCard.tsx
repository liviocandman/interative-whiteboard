import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Room } from '../../types/room';


interface RoomCardProps {
  room: Room;
  viewMode: 'grid' | 'list';
  onJoin: () => void;
  onDelete: () => void;
  onPreview: () => void;
}

export function RoomCard({ room, viewMode, onJoin, onDelete, onPreview }: RoomCardProps) {
  const isOwner = false; // TODO: Check if current user is owner
  const occupancyPercentage = (room.currentUsers / room.maxUsers) * 100;
  
  return (
    <div className={`room-card ${viewMode} ${!room.isPublic ? 'private' : ''}`}>
      {/* Thumbnail */}
      <div className="room-thumbnail" onClick={onPreview}>
        {/* Overlay info */}
        <div className="room-overlay">
          <div className="room-privacy">
            {room.isPublic ? '🌐' : '🔒'}
          </div>
          
          {room.hasPassword && (
            <div className="room-password">🔑</div>
          )}
        </div>
      </div>

      {/* Room Info */}
      <div className="room-info">
        <div className="room-header">
          <h3 className="room-name" title={room.name}>
            {room.name}
          </h3>
          
          <div className="room-actions">
            <button
              onClick={onPreview}
              className="action-btn preview"
              title="Visualizar detalhes"
            >
              👁️
            </button>
            
            {isOwner && (
              <button
                onClick={onDelete}
                className="action-btn delete"
                title="Deletar sala"
              >
                🗑️
              </button>
            )}
          </div>
        </div>

        <p className="room-description" title={room.description}>
          {room.description}
        </p>

        {/* Tags */}
        {room.tags.length > 0 && (
          <div className="room-tags">
            {room.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="room-tag">
                {tag}
              </span>
            ))}
            {room.tags.length > 3 && (
              <span className="room-tag more">
                +{room.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="room-stats">
          <div className="stat users">
            <span className="stat-icon">👥</span>
            <span className="stat-text">
              {room.currentUsers}/{room.maxUsers}
            </span>
            <div className="occupancy-bar">
              <div 
                className="occupancy-fill"
                style={{ width: `${occupancyPercentage}%` }}
              />
            </div>
          </div>

          <div className="stat created">
            <span className="stat-icon">📅</span>
            <span className="stat-text">
              {formatDistanceToNow(new Date(room.createdAt), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </div>

          {room.updatedAt !== room.createdAt && (
            <div className="stat updated">
              <span className="stat-icon">🔄</span>
              <span className="stat-text">
                {formatDistanceToNow(new Date(room.updatedAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </div>
          )}
        </div>

        {/* Creator info */}
        <div className="room-creator">
          <div className="creator-avatar">
            {room.createdBy.avatar ? (
              <img src={room.createdBy.avatar} alt={room.createdBy.name} />
            ) : (
              <div className="avatar-placeholder">
                {room.createdBy.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <span className="creator-name">
            por {room.createdBy.name}
          </span>
        </div>
      </div>

      {/* Join Button */}
      <div className="room-footer">
        <button
          onClick={onJoin}
          className="join-btn"
          disabled={room.currentUsers >= room.maxUsers}
        >
          {room.currentUsers >= room.maxUsers ? (
            <>🚫 Sala Lotada</>
          ) : room.hasPassword ? (
            <>🔑 Entrar</>
          ) : (
            <>🚪 Entrar</>
          )}
        </button>
      </div>
    </div>
  );
}