import React from 'react';
import '../../styles/components/AIThinkingIndicator.css';

interface AIThinkingIndicatorProps {
  isThinking: boolean;
  message?: string;
}

/**
 * Componente que muestra un indicador visual cuando la IA está "pensando"
 */
const AIThinkingIndicator: React.FC<AIThinkingIndicatorProps> = ({ 
  isThinking, 
  message = "La IA está analizando el tablero..." 
}) => {
  if (!isThinking) return null;

  return (
    <div className="ai-thinking-container">
      <div className="ai-thinking-spinner">
        <div className="spinner-inner"></div>
      </div>
      <div className="ai-thinking-message">
        <h3>{message}</h3>
        <p>Por favor, espera mientras la IA toma sus decisiones estratégicas.</p>
      </div>
    </div>
  );
};

export default AIThinkingIndicator;
