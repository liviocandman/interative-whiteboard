interface RoomNotFoundProps {
  roomId: string;
  onGoHome: () => void;
}

export function RoomNotFound({ roomId, onGoHome }: RoomNotFoundProps) {
  return (
    <div className="room-not-found">
      <div className="not-found-content">
        <div className="not-found-icon">🔍</div>
        <h1>Sala não encontrada</h1>
        <p>
          A sala <strong>"{roomId}"</strong> não existe ou não está mais disponível.
        </p>
        
        <div className="suggestions">
          <h3>Possíveis motivos:</h3>
          <ul>
            <li>A sala foi deletada pelo criador</li>
            <li>O link expirou</li>
            <li>Você digitou o código incorretamente</li>
          </ul>
        </div>
        
        <div className="not-found-actions">
          <button
            onClick={onGoHome}
            className="home-btn primary"
          >
            🏠 Ver Todas as Salas
          </button>
          
          <button
            onClick={() => {
              const newRoomId = prompt('Digite o código da sala:');
              if (newRoomId) {
                window.location.href = `/whiteboard?roomId=${newRoomId}`;
              }
            }}
            className="retry-btn secondary"
          >
            🔑 Tentar Outro Código
          </button>
        </div>
      </div>
    </div>
  );
}