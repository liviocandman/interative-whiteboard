import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { RoomBrowser } from '../components/rooms/RoomBrowser';
import { CreateRoomModal } from '../components/rooms/CreateRoomModal';
import { JoinRoomModal } from '../components/rooms/JoinRoomModal';
import { useRooms } from '../hooks/useRooms';
import type { Room, RoomFilter, CreateRoomData, JoinRoomData } from '../types/room';
import { Icons } from '../components/ui/Icons';

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

  useEffect(() => {
    refreshRooms();
    const interval = setInterval(refreshRooms, 30000);
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
    if (window.confirm('Tem certeza que deseja deletar esta sala?')) {
      try {
        await deleteRoom(roomId);
        refreshRooms();
      } catch (error) {
        console.error('Failed to delete room:', error);
        alert('Erro ao deletar a sala.');
      }
    }
  }, [deleteRoom, refreshRooms]);

  const filteredRooms = rooms.filter(room => {
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      if (!room.name.toLowerCase().includes(searchLower) &&
        !room.description.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    if (filter.isPublicOnly && !room.isPublic) return false;
    return true;
  });

  return (
    <div className="home-page min-h-screen text-[var(--text-primary)] font-sans">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-content">
          <div className="logo-container">
            <div className="logo-icon">
              <Icons.Grid className="w-5 h-5" />
            </div>
            <span className="text-headline tracking-tight">Whiteboard</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowJoinModal(true)}
              className="btn btn-ghost text-small"
            >
              Entrar com Código
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary text-small"
            >
              <Icons.Plus className="w-4 h-4" />
              Nova Sala
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="hero">
        <h1 className="text-h1">Colaboração simplificada.</h1>
        <p className="text-body">
          Crie, desenhe e compartilhe ideias em tempo real com uma interface limpa e intuitiva.
        </p>
      </div>

      {/* Main Content */}
      <main className="main-container">
        <div className="card">

          {/* Toolbar */}
          <div className="toolbar">
            <div className="flex items-center gap-4">
              <h2 className="text-headline">Salas Recentes</h2>
              <span className="bg-[var(--bg-secondary)] px-2 py-1 rounded-full text-small text-[var(--text-secondary)]">
                {filteredRooms.length}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="search-input-wrapper">
                <div className="search-icon">
                  <Icons.Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={filter.search}
                  onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                  className="search-input"
                />
              </div>
            </div>
          </div>

          {/* Room List */}
          <div className="room-list-container">
            {error ? (
              <div className="empty-state text-red-500">
                <p>Erro ao carregar salas: {error}</p>
                <button onClick={refreshRooms} className="btn btn-ghost text-[var(--accent-blue)]">
                  Tentar novamente
                </button>
              </div>
            ) : isLoading ? (
              <div className="empty-state">
                <div className="animate-spin mb-4">
                  <Icons.Grid className="w-8 h-8 opacity-50" />
                </div>
                <p>Carregando...</p>
              </div>
            ) : filteredRooms.length > 0 ? (
              <RoomBrowser
                rooms={filteredRooms}
                onJoinRoom={handleQuickJoin}
                onDeleteRoom={handleDeleteRoom}
                emptyState={null}
              />
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <Icons.Grid className="w-8 h-8" />
                </div>
                <h3 className="text-headline text-[var(--text-primary)] mb-2">Nenhuma sala encontrada</h3>
                <p className="text-body mb-6">Comece criando uma nova sala para colaborar.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-ghost text-[var(--accent-blue)]"
                >
                  Criar sala agora
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

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
