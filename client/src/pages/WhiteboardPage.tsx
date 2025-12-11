import { useSearchParams } from 'react-router-dom';
import { useUsers } from "../hooks/useUsers";
import { UserSetup } from "../components/users/UserSetup";
import { WhiteboardContainer } from "../components/whiteboard/WhiteboardContainer";

export function WhiteboardPage() {
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('roomId') || 'default';
  const { setupUser, isSettingUp, currentUser, otherUsers } = useUsers();

  const handleUserSetup = (name: string, color: string) => {
    console.log('[WhiteboardPage] User setup:', name, color);
    setupUser(name, color);
  };

  // Show user setup modal before entering whiteboard
  if (isSettingUp) {
    return <UserSetup onSetup={handleUserSetup} />;
  }

  return <WhiteboardContainer roomId={roomId} currentUser={currentUser} otherUsers={otherUsers} />;
}