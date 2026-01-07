import { useState, type ReactElement } from 'react';
import { FormField } from '../ui/FormField';
import { TagInput } from '../ui/TagInput';
import { Toggle } from '../ui/Toggle';
import { Button } from '../ui/Button';
import type { CreateRoomData, RoomSettings } from '../../types/room';

interface CreateRoomModalProps {
  onCreateRoom: (data: CreateRoomData) => Promise<void>;
  onClose: () => void;
}

const DEFAULT_SETTINGS: RoomSettings = {
  allowDrawing: true,
  allowChat: true,
  allowExport: true,
  requireApproval: false,
  backgroundColor: '#ffffff',
  canvasSize: 'large',
  enableGrid: false,
  enableRulers: false,
  autoSave: true,
  historyLimit: 20,
};

const POPULAR_TAGS = [
  'brainstorm', 'design', 'reunião', 'projeto', 'educação',
  'colaboração', 'prototipo', 'workshop', 'apresentação', 'rápida'
];

const CANVAS_SIZES = [
  { value: 'small', label: 'Pequeno (800x600)', icon: '📱' },
  { value: 'medium', label: 'Médio (1200x800)', icon: '💻' },
  { value: 'large', label: 'Grande (1920x1080)', icon: '🖥️' },
  { value: 'custom', label: 'Personalizado', icon: '⚙️' },
] as const;

const BACKGROUND_COLORS = [
  { value: '#ffffff', label: 'Branco', preview: '#ffffff' },
  { value: '#f8fafc', label: 'Cinza Claro', preview: '#f8fafc' },
  { value: '#fef3c7', label: 'Amarelo Claro', preview: '#fef3c7' },
  { value: '#dbeafe', label: 'Azul Claro', preview: '#dbeafe' },
  { value: '#dcfce7', label: 'Verde Claro', preview: '#dcfce7' },
  { value: '#fce7f3', label: 'Rosa Claro', preview: '#fce7f3' },
];

export function CreateRoomModal({ onCreateRoom, onClose }: CreateRoomModalProps): ReactElement {
  const [formData, setFormData] = useState<CreateRoomData>({
    name: '',
    description: '',
    isPublic: true,
    password: '',
    maxUsers: 10,
    tags: [],
    settings: DEFAULT_SETTINGS,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome da sala é obrigatório';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Nome deve ter no máximo 50 caracteres';
    }

    if (formData.description.length > 200) {
      newErrors.description = 'Descrição deve ter no máximo 200 caracteres';
    }

    if (!formData.isPublic && !formData.password) {
      newErrors.password = 'Senha é obrigatória para salas privadas';
    }

    if (formData.password && formData.password.length < 4) {
      newErrors.password = 'Senha deve ter pelo menos 4 caracteres';
    }

    if (formData.maxUsers < 1 || formData.maxUsers > 50) {
      newErrors.maxUsers = 'Número de usuários deve estar entre 1 e 50';
    }

    if (formData.settings.canvasSize === 'custom') {
      if (!formData.settings.customWidth || formData.settings.customWidth < 400) {
        newErrors.customWidth = 'Largura mínima é 400px';
      }
      if (!formData.settings.customHeight || formData.settings.customHeight < 300) {
        newErrors.customHeight = 'Altura mínima é 300px';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onCreateRoom(formData);
    } catch (error) {
      setErrors({ submit: 'Erro ao criar sala. Tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (updates: Partial<CreateRoomData>): void => {
    setFormData(prev => ({ ...prev, ...updates }));
    // Clear related errors
    if (errors.submit) {
      setErrors(prev => ({ ...prev, submit: '' }));
    }
  };

  const updateSettings = (updates: Partial<RoomSettings>): void => {
    setFormData(prev => ({
      ...prev,
      settings: { ...prev.settings, ...updates }
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-room-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✨ Criar Nova Sala</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-content">
            {/* Basic Info */}
            <div className="form-section">
              <h3>Informações Básicas</h3>

              <FormField
                label="Nome da Sala *"
                error={errors.name}
                icon="🏷️"
              >
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateFormData({ name: e.target.value })}
                  placeholder="Ex: Brainstorm de Marketing"
                  maxLength={50}
                  autoFocus
                />
              </FormField>

              <FormField
                label="Descrição"
                error={errors.description}
                icon="📝"
              >
                <textarea
                  value={formData.description}
                  onChange={(e) => updateFormData({ description: e.target.value })}
                  placeholder="Descreva o propósito desta sala..."
                  rows={3}
                  maxLength={200}
                />
                <div className="char-counter">
                  {formData.description.length}/200
                </div>
              </FormField>

              <FormField label="Tags" icon="🏷️">
                <TagInput
                  tags={formData.tags}
                  onChange={(tags) => updateFormData({ tags })}
                  suggestions={POPULAR_TAGS}
                  placeholder="Adicione tags para facilitar a busca..."
                  maxTags={5}
                />
              </FormField>
            </div>

            {/* Privacy & Access */}
            <div className="form-section">
              <h3>Privacidade e Acesso</h3>

              <div className="privacy-toggle">
                <Toggle
                  checked={formData.isPublic}
                  onChange={(isPublic) => updateFormData({
                    isPublic,
                    password: isPublic ? '' : formData.password
                  })}
                  label={formData.isPublic ? '🌐 Sala Pública' : '🔒 Sala Privada'}
                />
                <p className="toggle-description">
                  {formData.isPublic
                    ? 'Qualquer pessoa pode encontrar e entrar nesta sala'
                    : 'Apenas pessoas com a senha podem entrar nesta sala'
                  }
                </p>
              </div>

              {!formData.isPublic && (
                <FormField
                  label="Senha *"
                  error={errors.password}
                  icon="🔑"
                >
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => updateFormData({ password: e.target.value })}
                    placeholder="Digite uma senha segura"
                    minLength={4}
                  />
                </FormField>
              )}

              <FormField
                label="Máximo de Usuários"
                error={errors.maxUsers}
                icon="👥"
              >
                <input
                  type="number"
                  value={formData.maxUsers}
                  onChange={(e) => updateFormData({ maxUsers: Number(e.target.value) })}
                  min={1}
                  max={50}
                />
              </FormField>
            </div>

            {/* Advanced Settings */}
            <div className="form-section">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="advanced-toggle"
              >
                <span>⚙️ Configurações Avançadas</span>
                <span className={`arrow ${showAdvanced ? 'up' : 'down'}`}>▼</span>
              </button>

              {showAdvanced && (
                <div className="advanced-settings">
                  <div className="settings-grid">
                    <div className="setting-group">
                      <h4>Permissões</h4>

                      <Toggle
                        checked={formData.settings.allowDrawing}
                        onChange={(allowDrawing) => updateSettings({ allowDrawing })}
                        label="✏️ Permitir desenho"
                      />

                      <Toggle
                        checked={formData.settings.allowChat}
                        onChange={(allowChat) => updateSettings({ allowChat })}
                        label="💬 Habilitar chat"
                      />

                      <Toggle
                        checked={formData.settings.allowExport}
                        onChange={(allowExport) => updateSettings({ allowExport })}
                        label="💾 Permitir export"
                      />

                      <Toggle
                        checked={formData.settings.requireApproval}
                        onChange={(requireApproval) => updateSettings({ requireApproval })}
                        label="✋ Requer aprovação para entrar"
                      />
                    </div>

                    <div className="setting-group">
                      <h4>Canvas</h4>

                      <FormField label="Tamanho do Canvas" icon="📐">
                        <select
                          value={formData.settings.canvasSize}
                          onChange={(e) => updateSettings({
                            canvasSize: e.target.value as RoomSettings['canvasSize']
                          })}
                        >
                          {CANVAS_SIZES.map(size => (
                            <option key={size.value} value={size.value}>
                              {size.icon} {size.label}
                            </option>
                          ))}
                        </select>
                      </FormField>

                      {formData.settings.canvasSize === 'custom' && (
                        <div className="custom-size-inputs">
                          <FormField label="Largura (px)" error={errors.customWidth}>
                            <input
                              type="number"
                              value={formData.settings.customWidth || ''}
                              onChange={(e) => updateSettings({
                                customWidth: Number(e.target.value)
                              })}
                              min={400}
                              placeholder="1200"
                            />
                          </FormField>

                          <FormField label="Altura (px)" error={errors.customHeight}>
                            <input
                              type="number"
                              value={formData.settings.customHeight || ''}
                              onChange={(e) => updateSettings({
                                customHeight: Number(e.target.value)
                              })}
                              min={300}
                              placeholder="800"
                            />
                          </FormField>
                        </div>
                      )}

                      <FormField label="Cor de Fundo" icon="🎨">
                        <div className="color-picker-grid">
                          {BACKGROUND_COLORS.map(color => (
                            <button
                              key={color.value}
                              type="button"
                              onClick={() => updateSettings({ backgroundColor: color.value })}
                              className={`color-option ${formData.settings.backgroundColor === color.value ? 'selected' : ''
                                }`}
                              style={{ backgroundColor: color.preview }}
                              title={color.label}
                            />
                          ))}
                        </div>
                      </FormField>
                    </div>

                    <div className="setting-group">
                      <h4>Recursos</h4>

                      <Toggle
                        checked={formData.settings.enableGrid}
                        onChange={(enableGrid) => updateSettings({ enableGrid })}
                        label="⊞ Mostrar grade"
                      />

                      <Toggle
                        checked={formData.settings.enableRulers}
                        onChange={(enableRulers) => updateSettings({ enableRulers })}
                        label="📏 Mostrar réguas"
                      />

                      <Toggle
                        checked={formData.settings.autoSave}
                        onChange={(autoSave) => updateSettings({ autoSave })}
                        label="💾 Salvamento automático"
                      />

                      <FormField label="Limite do Histórico" icon="📚">
                        <input
                          type="number"
                          value={formData.settings.historyLimit}
                          onChange={(e) => updateSettings({
                            historyLimit: Number(e.target.value)
                          })}
                          min={5}
                          max={100}
                        />
                      </FormField>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {errors.submit && (
            <div className="form-error">
              ❌ {errors.submit}
            </div>
          )}

          <div className="modal-footer">
            <Button
              type="button"
              onClick={onClose}
              variant="default"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              variant="active"
              disabled={isSubmitting}
              className="create-btn"
            >
              {isSubmitting ? (
                <>⏳ Criando...</>
              ) : (
                <>✨ Criar Sala</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}