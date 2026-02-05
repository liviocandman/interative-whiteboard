import { useState, type ReactElement } from 'react';
import { Button } from '../ui/Button';
import './UserSetup.css';

interface UserSetupProps {
  onSetup: (name: string, color: string) => void;
}

const PRESET_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FECA57', '#FF9FF3', '#54A0FF', '#FD79A8'
];

const PRESET_NAMES = [
  'Designer', 'Developer', 'Manager', 'Student',
  'Teacher', 'Artist', 'Writer', 'Analyst'
];

export function UserSetup({ onSetup }: UserSetupProps): ReactElement {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (name.trim()) {
      onSetup(name.trim(), selectedColor);
    }
  };

  const generateRandomName = (): void => {
    const randomName = PRESET_NAMES[Math.floor(Math.random() * PRESET_NAMES.length)];
    const randomNumber = Math.floor(Math.random() * 1000);
    setName(`${randomName}${randomNumber}`);
  };

  return (
    <div className="user-setup-overlay">
      <div className="user-setup-modal">
        <div className="setup-header">
          <div className="welcome-emoji">
            👋
          </div>
          <h2>Bem-vindo!</h2>
          <p className="text-secondary text-sm mt-2">
            Configure seu perfil para começar a colaborar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="setup-form">
          <div className="form-group">
            <label htmlFor="userName" className="field-label">Seu nome</label>
            <div className="name-input-group">
              <input
                id="userName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como você quer ser chamado?"
                maxLength={20}
                autoFocus
                className="name-input"
              />
              <Button type="button" onClick={generateRandomName} variant="default" title="Gerar nome aleatório">
                🎲
              </Button>
            </div>
          </div>

          <div className="form-group">
            <label className="field-label">Sua cor</label>
            <div className="color-grid">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                  aria-label={`Cor ${color}`}
                />
              ))}
            </div>
          </div>

          <div className="setup-footer">
            <Button type="submit" variant="active" disabled={!name.trim()} className="btn-full">
              Entrar no Whiteboard
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}