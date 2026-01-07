import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUsers } from "../hooks/useUsers";
import { UserSetup } from "../components/users/UserSetup";
import { WhiteboardContainer } from "../components/whiteboard/WhiteboardContainer";
import { roomService } from "../services/roomService";
import type { Room } from "../types/room";

export function WhiteboardPage() {
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('roomId') || 'default';
  const { setupUser, isSettingUp, currentUser, otherUsers } = useUsers();

  // Room data state
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);

  // Fetch room data
  useEffect(() => {
    async function fetchRoom() {
      try {
        setIsLoadingRoom(true);
        setRoomError(null);
        const roomData = await roomService.getRoomById(roomId);
        setRoom(roomData);
      } catch (error) {
        console.error('Error fetching room:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load room settings';
        setRoomError(errorMessage);
        // Continue with null room - will use default settings
        setRoom(null);
      } finally {
        setIsLoadingRoom(false);
      }
    }

    fetchRoom();
  }, [roomId]);

  const handleUserSetup = (name: string, color: string) => {
    console.log('[WhiteboardPage] User setup:', name, color);
    setupUser(name, color);
  };

  // Show user setup modal before entering whiteboard
  if (isSettingUp) {
    return <UserSetup onSetup={handleUserSetup} />;
  }

  // Show loading state while fetching room
  if (isLoadingRoom) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        gap: '1rem'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid var(--primary-color)',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ fontSize: '1rem', fontWeight: 500 }}>Loading room settings...</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Room: {roomId}</p>
      </div>
    );
  }

  return (
    <WhiteboardContainer
      roomId={roomId}
      currentUser={currentUser}
      otherUsers={otherUsers}
      room={room}
      roomError={roomError}
    />
  );
}