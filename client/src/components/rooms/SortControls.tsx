import type { ReactElement } from 'react';
import type { RoomFilter } from '../../types/room';

interface SortControlsProps {
  sortBy: RoomFilter['sortBy'];
  sortOrder: RoomFilter['sortOrder'];
  onSortChange: (sortBy: RoomFilter['sortBy'], sortOrder: RoomFilter['sortOrder']) => void;
}

const SORT_OPTIONS = [
  { value: 'updated', label: 'Última Atividade', icon: '🔄' },
  { value: 'created', label: 'Data de Criação', icon: '📅' },
  { value: 'name', label: 'Nome', icon: '🔤' },
  { value: 'users', label: 'Usuários Online', icon: '👥' },
] as const;

export function SortControls({ sortBy, sortOrder, onSortChange }: SortControlsProps): ReactElement {
  const currentOption = SORT_OPTIONS.find(opt => opt.value === sortBy);

  const handleSortByChange = (newSortBy: RoomFilter['sortBy']): void => {
    // If same sort field, toggle order; otherwise use default desc
    if (newSortBy === sortBy) {
      onSortChange(newSortBy, sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      onSortChange(newSortBy, 'desc');
    }
  };

  const handleOrderToggle = (): void => {
    onSortChange(sortBy, sortOrder === 'desc' ? 'asc' : 'desc');
  };

  return (
    <div className="sort-controls">
      <div className="sort-label">
        <span>📊 Ordenar por:</span>
      </div>

      <div className="sort-options">
        <div className="sort-by-dropdown">
          <select
            value={sortBy}
            onChange={(e) => handleSortByChange(e.target.value as RoomFilter['sortBy'])}
            className="sort-select"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.icon} {option.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleOrderToggle}
          className={`sort-order-btn ${sortOrder}`}
          title={`Ordenação ${sortOrder === 'desc' ? 'decrescente' : 'crescente'}`}
        >
          {sortOrder === 'desc' ? (
            <>
              <span className="order-icon">↓</span>
              <span className="order-text">Maior → Menor</span>
            </>
          ) : (
            <>
              <span className="order-icon">↑</span>
              <span className="order-text">Menor → Maior</span>
            </>
          )}
        </button>
      </div>

      <div className="sort-info">
        <span className="current-sort">
          {currentOption?.icon} {currentOption?.label} 
          <span className="order-indicator">
            {sortOrder === 'desc' ? ' ↓' : ' ↑'}
          </span>
        </span>
      </div>
    </div>
  );
}