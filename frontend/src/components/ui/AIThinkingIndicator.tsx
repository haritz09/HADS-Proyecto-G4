import React from 'react';
import '../../styles/components/AIThinkingIndicator.css';

interface RetryInfo {
  retryCount: number;
  retryWaitTime: number;
  currentModel: string | null;
}

interface AIThinkingIndicatorProps {
  isThinking: boolean;
  message?: string;
  retryInfo?: RetryInfo;
  networkIssues?: boolean;
}

/**
 * Componente que muestra un indicador visual cuando la IA está "pensando"
 * Ahora incluye información sobre reintentos cuando están ocurriendo
 * y advertencias sobre problemas de red
 */
const AIThinkingIndicator: React.FC<AIThinkingIndicatorProps> = ({ 
  isThinking, 
  message = "La IA está analizando el tablero...",
  retryInfo,
  networkIssues = false
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
        
        {retryInfo && (
          <div className="ai-retry-info">
            <p>
              <span className="retry-badge">Reintento #{retryInfo.retryCount}</span>
              {retryInfo.currentModel && (
                <span className="model-badge">Modelo: {retryInfo.currentModel}</span>
              )}
            </p>
            {retryInfo.retryWaitTime > 0 && (
              <p className="retry-timer">Esperando {retryInfo.retryWaitTime}s antes del siguiente intento</p>
            )}
          </div>
        )}
        
        {networkIssues && (
          <div className="network-issues-warning">
            <p>⚠️ Hay problemas de conexión. La IA sigue procesando en el servidor.</p>
            <p className="detail-text">No cierres esta ventana. El juego continuará automáticamente cuando se resuelva.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIThinkingIndicator;
