import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { WhiteboardPage } from './pages/WhiteboardPage';
import { NotFoundPage } from './pages/NotFoundPage';

import './styles/rooms.css';


function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          {/* Home page with room browser */}
          <Route path="/" element={<HomePage />} />
          
          {/* Whiteboard page */}
          <Route path="/whiteboard" element={<WhiteboardPage />} />
          
          {/* Redirect old room URLs */}
          <Route 
            path="/room/:roomId" 
            element={<Navigate to="/whiteboard" replace />} 
          />
          
          {/* 404 page */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
