import { useState, type ReactElement } from 'react';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';
import type { Room, JoinRoomData } from '../../types/room';

interface JoinRoomModalProps {
  room: Room | null;
  onJoinRoom: (data: JoinRoomData) => Promise<void>;
  onClose: () => void;
}

export function JoinRoomModal({ room, onJoinRoom, onClose }: JoinRoomModalProps): ReactElement {
  const [password, setPassword] = useState('');
  const [customRoomId, setCustomRoomId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Mode: 'specific' for joining a specific room, 'custom' for entering room ID
  const mode = room ? 'specific' : 'custom';

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');

    const roomId = mode === 'specific' ? room!.id : customRoomId.trim();
    
    if (!roomId) {
      setError('Código da sala é obrigatório');
      return;
    }

    if (mode === 'specific' && room!.hasPassword && !password.trim()) {
      setError('Senha é obrigatória para esta sala');
      return;
    }

    setIsSubmitting(true);

    try {
      const joinData: JoinRoomData = {
        roomId,
        password: password.trim() || undefined,
      };

      await onJoinRoom(joinData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar na sala');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (): void => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="join-room-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {mode === 'specific' ? (
              <>🔑 Entrar na Sala</>
            ) : (
              <>🚪 Entrar com Código</>
            )}
          </h2>
          <button 
            onClick={handleClose} 
            className="close-btn"
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-content">
            {mode === 'specific' && room ? (
              // Joining a specific room
              <div className="room-info-section">
                <div className="room-summary">
                  <div className="room-icon">
                    {room.isPublic ? '🌐' : '🔒'}
                  </div>
                  <div className="room-details">
                    <h3 className="room-name">{room.name}</h3>
                    <p className="room-description">
                      {room.description || 'Sem descrição disponível'}
                    </p>
                    <div className="room-stats">
                      <span className="stat">👥 {room.currentUsers}/{room.maxUsers}</span>
                      <span className="stat">👤 {room.createdBy.name}</span>
                    </div>
                  </div>
                </div>

                {room.hasPassword && (
                  <FormField
                    label="Senha da Sala *"
                    error={error}
                    icon="🔑"
                  >
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite a senha da sala..."
                      autoFocus
                      disabled={isSubmitting}
                    />
                  </FormField>
                )}

                {!room.hasPassword && (
                  <div className="no-password-info">
                    <div className="info-icon">ℹ️</div>
                    <p>Esta sala é pública e não requer senha.</p>
                  </div>
                )}
              </div>
            ) : (
              // Entering custom room ID
              <div className="custom-room-section">
                <FormField
                  label="Código da Sala *"
                  error={error}
                  icon="🏷️"
                >
                  <input
                    type="text"
                    value={customRoomId}
                    onChange={(e) => setCustomRoomId(e.target.value)}
                    placeholder="Ex: sala-reuniao-123"
                    autoFocus
                    disabled={isSubmitting}
                  />
                </FormField>

                <FormField
                  label="Senha (se necessário)"
                  icon="🔑"
                >
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Deixe vazio se a sala for pública"
                    disabled={isSubmitting}
                  />
                </FormField>

                <div className="room-id-help">
                  <h4>💡 Dicas:</h4>
                  <ul>
                    <li>O código da sala geralmente aparece na URL</li>
                    <li>Pode conter letras, números e hífens</li>
                    <li>Se a sala for privada, você precisará da senha</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="form-error">
              ❌ {error}
            </div>
          )}

          <div className="modal-footer">
            <Button
              type="button"
              onClick={handleClose}
              variant="default"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            
            <Button
              type="submit"
              variant="active"
              disabled={isSubmitting}
              className="join-btn"
            >
              {isSubmitting ? (
                <>⏳ Entrando...</>
              ) : mode === 'specific' ? (
                <>🚪 Entrar na Sala</>
              ) : (
                <>🔍 Buscar e Entrar</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}