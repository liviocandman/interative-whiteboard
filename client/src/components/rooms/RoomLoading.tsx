interface RoomLoadingProps {
  roomId: string;
}

export function RoomLoading({ roomId }: RoomLoadingProps) {
  return (
    <div className="room-loading">
      <div className="loading-content">
        <div className="loading-spinner large" />
        <h2>Carregando sala...</h2>
        <p>Verificando se a sala <strong>"{roomId}"</strong> existe...</p>
        
        <div className="loading-steps">
          <div className="step active">✓ Conectando ao servidor</div>
          <div className="step active">✓ Verificando permissões</div>
          <div className="step">⏳ Carregando dados da sala</div>
        </div>
      </div>
    </div>
  );
}
