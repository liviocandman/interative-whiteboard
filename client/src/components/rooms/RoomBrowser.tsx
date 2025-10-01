import { useState, type ReactElement } from 'react';
import { RoomCard } from './RoomCard';
import { RoomPreview } from './RoomPreview';
import type { Room } from '../../types/room';

interface RoomBrowserProps {
  rooms: Room[];
  onJoinRoom: (room: Room) => void;
  onDeleteRoom: (roomId: string) => void;
  emptyState?: React.ReactNode;
  viewMode?: 'grid' | 'list';
}

export function RoomBrowser({
  rooms,
  onJoinRoom,
  onDeleteRoom,
  emptyState,
  viewMode = 'grid',
}: RoomBrowserProps): ReactElement {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [currentViewMode, setCurrentViewMode] = useState(viewMode);

  if (rooms.length === 0) {
    return <div className="room-browser-empty">{emptyState}</div>;
  }

  return (
    <div className="room-browser">
      {/* View Mode Toggle */}
      <div className="view-controls">
        <div className="view-mode-toggle">
          <button
            onClick={() => setCurrentViewMode('grid')}
            className={`view-mode-btn ${currentViewMode === 'grid' ? 'active' : ''}`}
            title="Visualização em grade"
          >
            ⊞
          </button>
          <button
            onClick={() => setCurrentViewMode('list')}
            className={`view-mode-btn ${currentViewMode === 'list' ? 'active' : ''}`}
            title="Visualização em lista"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Rooms Grid/List */}
      <div className={`rooms-container ${currentViewMode}`}>
        {rooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            viewMode={currentViewMode}
            onJoin={() => onJoinRoom(room)}
            onDelete={() => onDeleteRoom(room.id)}
            onPreview={() => setSelectedRoom(room)}
          />
        ))}
      </div>

      {/* Room Preview Modal */}
      {selectedRoom && (
        <RoomPreview
          room={selectedRoom}
          onJoin={() => {
            onJoinRoom(selectedRoom);
            setSelectedRoom(null);
          }}
          onClose={() => setSelectedRoom(null)}
        />
      )}
    </div>
  );
}