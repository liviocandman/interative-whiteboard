import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <div className="not-found-icon">🎨</div>
        <h1>Oops! Página não encontrada</h1>
        <p>A página que você está procurando não existe ou foi movida.</p>
        
        <div className="not-found-actions">
          <button
            onClick={() => navigate('/')}
            className="home-btn primary"
          >
            🏠 Voltar ao Início
          </button>
          
          <button
            onClick={() => window.history.back()}
            className="back-btn secondary"
          >
            ← Página Anterior
          </button>
        </div>
      </div>
    </div>
  );
}