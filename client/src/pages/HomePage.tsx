import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { RoomBrowser } from '../components/rooms/RoomBrowser';
import { CreateRoomModal } from '../components/rooms/CreateRoomModal';
import { JoinRoomModal } from '../components/rooms/JoinRoomModal';
import { SearchBar } from '../components/rooms/SearchBar';
import { SortControls } from '../components/rooms/SortControls';
import { useRooms } from '../hooks/useRooms';
import type { Room, RoomFilter, CreateRoomData, JoinRoomData } from '../types/room';

export function HomePage(): ReactElement {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [filter, setFilter] = useState<RoomFilter>({
    search: '',
    tags: [],
    isPublicOnly: false,
    sortBy: 'updated',
    sortOrder: 'desc',
  });

  const {
    rooms,
    isLoading,
    error,
    createRoom,
    joinRoom,
    deleteRoom,
    refreshRooms,
  } = useRooms();

  // Refresh rooms on mount and periodically
  useEffect(() => {
    refreshRooms();
    const interval = setInterval(refreshRooms, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [refreshRooms]);

  const handleCreateRoom = useCallback(async (data: CreateRoomData): Promise<void> => {
    try {
      const room = await createRoom(data);
      setShowCreateModal(false);

      window.location.href = `/whiteboard?roomId=${room.id}`;
    } catch (error) {
      console.error('Failed to create room:', error);
      throw error;
    }
  }, [createRoom]);

  const handleJoinRoom = useCallback(async (data: JoinRoomData): Promise<void> => {
    try {
      await joinRoom(data);
      setShowJoinModal(false);

      window.location.href = `/whiteboard?roomId=${data.roomId}`;
    } catch (error) {
      console.error('Failed to join room:', error);
      throw error;
    }
  }, [joinRoom]);

  const handleQuickJoin = useCallback((room: Room): void => {
    if (room.hasPassword) {
      setSelectedRoom(room);
      setShowJoinModal(true);
    } else {
      handleJoinRoom({ roomId: room.id });
    }
  }, [handleJoinRoom]);

  const handleDeleteRoom = useCallback(async (roomId: string): Promise<void> => {
    if (window.confirm('Tem certeza que deseja deletar esta sala? Esta ação não pode ser desfeita.')) {
      try {
        await deleteRoom(roomId);
        refreshRooms();
      } catch (error) {
        console.error('Failed to delete room:', error);
        alert('Erro ao deletar a sala. Tente novamente.');
      }
    }
  }, [deleteRoom, refreshRooms]);

  const filteredRooms = rooms.filter(room => {
    // Search filter
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      if (
        !room.name.toLowerCase().includes(searchLower) &&
        !room.description.toLowerCase().includes(searchLower) &&
        !room.tags.some(tag => tag.toLowerCase().includes(searchLower))
      ) {
        return false;
      }
    }

    // Public only filter
    if (filter.isPublicOnly && !room.isPublic) {
      return false;
    }

    // Tags filter
    if (filter.tags.length > 0) {
      if (!filter.tags.some(tag => room.tags.includes(tag))) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => {
    let comparison = 0;
    
    switch (filter.sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'created':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'updated':
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
      case 'users':
        comparison = a.currentUsers - b.currentUsers;
        break;
    }
    
    return filter.sortOrder === 'desc' ? -comparison : comparison;
  });

  return (
    <div className="home-page">
      {/* Header */}
      <header className="home-header">
        <div className="header-content">
          <div className="brand">
            <h1 className="app-title">
              <span className="logo">🎨</span>
              Collaborative Whiteboard
            </h1>
            <p className="app-subtitle">
              Crie, colabore e compartilhe suas ideias em tempo real
            </p>
          </div>
          
          <div className="header-actions">
            <button
              onClick={() => setShowCreateModal(true)}
              className="create-room-btn primary"
            >
              ➕ Nova Sala
            </button>
            
            <button
              onClick={() => setShowJoinModal(true)}
              className="join-room-btn secondary"
            >
              🚪 Entrar com Código
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="home-main">
        <div className="main-content">
          {/* Sidebar with stats and filters */}
          <aside className="sidebar">
           
            
            <div className="filters-section">
              <h3>Filtros</h3>
              
              <SearchBar
                value={filter.search}
                onChange={(search) => setFilter(prev => ({ ...prev, search }))}
                placeholder="Buscar salas..."
              />
              
              
              <div className="filter-options">
                <label className="filter-option">
                  <input
                    type="checkbox"
                    checked={filter.isPublicOnly}
                    onChange={(e) => setFilter(prev => ({ 
                      ...prev, 
                      isPublicOnly: e.target.checked 
                    }))}
                  />
                  Apenas salas públicas
                </label>
              </div>
            </div>
          </aside>

          {/* Main room browser */}
          <div className="rooms-section">
            <div className="rooms-header">
              <div className="rooms-title">
                <h2>Salas Disponíveis</h2>
                <span className="rooms-count">
                  {filteredRooms.length} sala{filteredRooms.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              <SortControls
                sortBy={filter.sortBy}
                sortOrder={filter.sortOrder}
                onSortChange={(sortBy, sortOrder) => 
                  setFilter(prev => ({ ...prev, sortBy, sortOrder }))
                }
              />
            </div>

            {isLoading ? (
              <div className="loading-state">
                <div className="loading-spinner" />
                <p>Carregando salas...</p>
              </div>
            ) : error ? (
              <div className="error-state">
                <p>❌ Erro ao carregar salas: {error}</p>
                <button onClick={refreshRooms} className="retry-btn">
                  🔄 Tentar Novamente
                </button>
              </div>
            ) : (
              <RoomBrowser
                rooms={filteredRooms}
                onJoinRoom={handleQuickJoin}
                onDeleteRoom={handleDeleteRoom}
                emptyState={
                  <div className="empty-state">
                    <div className="empty-icon">🏠</div>
                    <h3>Nenhuma sala encontrada</h3>
                    <p>
                      {filter.search || filter.tags.length > 0 
                        ? 'Tente ajustar os filtros ou criar uma nova sala.'
                        : 'Seja o primeiro a criar uma sala!'
                      }
                    </p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="create-first-room-btn"
                    >
                      ➕ Criar Primeira Sala
                    </button>
                  </div>
                }
              />
            )}
          </div>
        </div>
      </main>

      {/* Quick Actions Footer */}
      <footer className="home-footer">
        <div className="footer-content">
          <div className="quick-actions">
            <h3>Ações Rápidas</h3>
            <div className="quick-action-buttons">
              <button
                onClick={() => handleCreateRoom({
                  name: `Sala Rápida ${new Date().getHours()}:${new Date().getMinutes()}`,
                  description: 'Sala criada rapidamente para colaboração',
                  isPublic: true,
                  maxUsers: 10,
                  tags: ['rápida'],
                  settings: {
                    allowDrawing: true,
                    allowChat: true,
                    allowExport: true,
                    requireApproval: false,
                    backgroundColor: '#ffffff',
                    canvasSize: 'medium',
                    enableGrid: false,
                    enableRulers: false,
                    autoSave: true,
                    historyLimit: 20,
                  }
                })}
                className="quick-action-btn"
              >
                ⚡ Sala Rápida
              </button>
              
              <button
                onClick={() => window.open('/whiteboard?roomId=demo', '_blank')}
                className="quick-action-btn"
              >
                🎯 Modo Demo
              </button>
            </div>
          </div>
          
          <div className="footer-info">
            <p>&copy; 2024 Collaborative Whiteboard.</p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {showCreateModal && (
        <CreateRoomModal
          onCreateRoom={handleCreateRoom}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {showJoinModal && (
        <JoinRoomModal
          room={selectedRoom}
          onJoinRoom={handleJoinRoom}
          onClose={() => {
            setShowJoinModal(false);
            setSelectedRoom(null);
          }}
        />
      )}
    </div>
  );
}