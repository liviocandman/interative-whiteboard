import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Room } from '../../types/room';
import type { ReactElement } from 'react';

interface RoomPreviewProps {
  room: Room;
  onJoin: () => void;
  onClose: () => void;
}

export function RoomPreview({ room, onJoin, onClose }: RoomPreviewProps): ReactElement {
  return (
    <div className="room-preview-overlay" onClick={onClose}>
      <div className="room-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <h2 className="preview-title">{room.name}</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <div className="preview-content">
          {/* Thumbnail */}
          <div className="preview-thumbnail">
            {room.thumbnail ? (
              <img src={room.thumbnail} alt={room.name} />
            ) : (
              <div className="thumbnail-placeholder large">
                <span className="thumbnail-icon">🎨</span>
                <p>Sem visualização disponível</p>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="preview-details">
            <div className="detail-section">
              <h3>Descrição</h3>
              <p>{room.description || 'Sem descrição disponível.'}</p>
            </div>

            <div className="detail-section">
              <h3>Informações</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Tipo:</span>
                  <span className="info-value">
                    {room.isPublic ? '🌐 Pública' : '🔒 Privada'}
                  </span>
                </div>

                <div className="info-item">
                  <span className="info-label">Usuários:</span>
                  <span className="info-value">
                    {room.currentUsers}/{room.maxUsers}
                  </span>
                </div>

                <div className="info-item">
                  <span className="info-label">Criado:</span>
                  <span className="info-value">
                    {formatDistanceToNow(new Date(room.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>

                <div className="info-item">
                  <span className="info-label">Criador:</span>
                  <span className="info-value">
                    {room.createdBy.name}
                  </span>
                </div>
              </div>
            </div>

            {room.tags.length > 0 && (
              <div className="detail-section">
                <h3>Tags</h3>
                <div className="preview-tags">
                  {room.tags.map((tag, index) => (
                    <span key={index} className="preview-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="detail-section">
              <h3>Configurações da Sala</h3>
              <div className="settings-grid">
                <div className="setting-item">
                  <span className={`setting-status ${room.settings.allowDrawing ? 'enabled' : 'disabled'}`}>
                    {room.settings.allowDrawing ? '✅' : '❌'}
                  </span>
                  <span>Desenho permitido</span>
                </div>

                <div className="setting-item">
                  <span className={`setting-status ${room.settings.allowChat ? 'enabled' : 'disabled'}`}>
                    {room.settings.allowChat ? '✅' : '❌'}
                  </span>
                  <span>Chat habilitado</span>
                </div>

                <div className="setting-item">
                  <span className={`setting-status ${room.settings.allowExport ? 'enabled' : 'disabled'}`}>
                    {room.settings.allowExport ? '✅' : '❌'}
                  </span>
                  <span>Export permitido</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="preview-footer">
          <button onClick={onClose} className="cancel-btn">
            Cancelar
          </button>
          <button
            onClick={onJoin}
            className="join-btn primary"
            disabled={room.currentUsers >= room.maxUsers}
          >
            {room.currentUsers >= room.maxUsers ? (
              '🚫 Sala Lotada'
            ) : room.hasPassword ? (
              '🔑 Entrar na Sala'
            ) : (
              '🚪 Entrar na Sala'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}