import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUsers } from "../hooks/useUsers";
import { UserSetup } from "../components/users/UserSetup";
import { WhiteboardContainer } from "../components/whiteboard/WhiteboardContainer";
import { roomService } from "../services/roomService";
import './WhiteboardPage.css';
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
      <div className="loading-room-container">
        <div className="loading-room-spinner" />
        <p className="loading-room-title">Loading room settings...</p>
        <p className="loading-room-subtitle">Room: {roomId}</p>
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