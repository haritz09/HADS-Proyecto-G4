import React from 'react';
import '../../styles/components/AIViewModeSettings.css';
import { AIViewMode } from './AIViewToggle';

interface AIViewModeSettingsProps {
  currentMode: AIViewMode;
  onModeChange: (mode: AIViewMode) => void;
  onClose: () => void;
}

/**
 * Panel de configuración para el modo de visualización de la IA
 */
const AIViewModeSettings: React.FC<AIViewModeSettingsProps> = ({
  currentMode,
  onModeChange,
  onClose
}) => {
  return (
    <div className="ai-view-settings-panel">
      <div className="settings-header">
        <h3>Configuración de Visualización</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="settings-content">
        <h4>Modo de Visualización del Turno de la IA</h4>
        
        <div className="view-mode-options">
          <div className="option-card">
            <div className={`option-selector ${currentMode === 'normal' ? 'selected' : ''}`}
                onClick={() => onModeChange('normal')}>
              <div className="option-icon">👁️</div>
              <h5>Vista Normal</h5>
              <p>Ver el mapa desde tu perspectiva durante toda la partida.</p>
            </div>
          </div>
          
          <div className="option-card">
            <div className={`option-selector ${currentMode === 'changeView' ? 'selected' : ''}`}
                onClick={() => onModeChange('changeView')}>
              <div className="option-icon">🔄</div>
              <h5>Cambio de Vista</h5>
              <p>La vista cambia a la perspectiva de la IA durante su turno.</p>
            </div>
          </div>
          
          <div className="option-card">
            <div className={`option-selector ${currentMode === 'splitView' ? 'selected' : ''}`}
                onClick={() => onModeChange('splitView')}>
              <div className="option-icon">⚔️</div>
              <h5>Vista Dividida</h5>
              <p>Muestra tu vista y la vista de la IA lado a lado durante su turno.</p>
            </div>
          </div>
        </div>
        
        <div className="settings-info">
          <p>Estas opciones te permiten elegir cómo visualizar el turno de la IA. Puedes cambiar entre estos modos en cualquier momento durante la partida.</p>
        </div>
      </div>
    </div>
  );
};

export default AIViewModeSettings;
