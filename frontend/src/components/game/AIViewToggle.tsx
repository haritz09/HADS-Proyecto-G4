import React from 'react';
import '../../styles/components/AIViewToggle.css';

export type AIViewMode = 'normal' | 'changeView' | 'splitView';

interface AIViewToggleProps {
  currentMode: AIViewMode;
  onModeChange: (mode: AIViewMode) => void;
  isVisible: boolean;
}

/**
 * Componente para cambiar entre diferentes modos de visualización del turno de la IA
 */
const AIViewToggle: React.FC<AIViewToggleProps> = ({ 
  currentMode, 
  onModeChange,
  isVisible
}) => {
  if (!isVisible) return null;

  return (
    <div className="ai-view-toggle">
      <div className="toggle-title">Modo de visualización</div>
      
      <div className="toggle-options">
        <button 
          className={`toggle-option ${currentMode === 'normal' ? 'active' : ''}`}
          onClick={() => onModeChange('normal')}
          title="Modo normal - Ver sólo tu perspectiva"
        >
          <span className="option-icon">👁️</span>
          <span className="option-label">Normal</span>
        </button>
        
        <button 
          className={`toggle-option ${currentMode === 'changeView' ? 'active' : ''}`}
          onClick={() => onModeChange('changeView')}
          title="Cambio de vista - Ver desde la perspectiva de la IA durante su turno"
        >
          <span className="option-icon">🔄</span>
          <span className="option-label">Cambio de vista</span>
        </button>
        
        <button 
          className={`toggle-option ${currentMode === 'splitView' ? 'active' : ''}`}
          onClick={() => onModeChange('splitView')}
          title="Vista dividida - Ver ambas perspectivas simultáneamente"
        >
          <span className="option-icon">⚔️</span>
          <span className="option-label">Vista dividida</span>
        </button>
      </div>
    </div>
  );
};

export default AIViewToggle;
