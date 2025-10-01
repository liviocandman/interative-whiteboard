import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { WhiteboardContainer } from '../components/whiteboard/WhiteboardContainer';
import { RoomNotFound } from '../components/rooms/RoomNotFound';
import { RoomLoading } from '../components/rooms/RoomLoading';
import { roomService } from '../services/roomService';

export function WhiteboardPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [roomExists, setRoomExists] = useState<boolean | null>(null);

  const roomId = searchParams.get('roomId');

  useEffect(() => {
    // If no roomId, redirect to home
    if (!roomId) {
      navigate('/', { replace: true });
      return;
    }

    // Validate room exists
    const checkRoom = async (): Promise<void> => {
      try {
        const exists = await roomService.checkRoomExists(roomId);
        setRoomExists(exists);
      } catch (error) {
        console.error('Error checking room:', error);
        setRoomExists(false);
      }
    };

    checkRoom();
  }, [roomId, navigate]);

  if (!roomId) {
    return <div>Redirecionando...</div>;
  }

  if (roomExists === null) {
    return <RoomLoading roomId={roomId} />;
  }

  if (roomExists === false) {
    return <RoomNotFound roomId={roomId} onGoHome={() => navigate('/')} />;
  }

  return <WhiteboardContainer roomId={roomId} />;
}