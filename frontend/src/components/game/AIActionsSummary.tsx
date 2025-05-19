import React from 'react';
import '../../styles/components/AIActionsSummary.css';

interface AIAction {
  action: string;
  details?: any;
  result?: any;
  error?: string;
}

interface AIActionsSummaryProps {
  actions: AIAction[];
  strategicInfo?: Record<string, string>;
  isVisible: boolean;
  onClose: () => void;
}

/**
 * Componente que muestra un resumen de todas las acciones realizadas por la IA
 */
const AIActionsSummary: React.FC<AIActionsSummaryProps> = ({
  actions,
  strategicInfo,
  isVisible,
  onClose
}) => {
  if (!isVisible) return null;

  // Función para obtener un icono basado en el tipo de acción
  const getActionIcon = (actionType: string): string => {
    switch (actionType?.toLowerCase()) {
      case 'movehero':
        return '🚶';
      case 'buildstructure':
        return '🏗️';
      case 'recruitunits':
        return '👥';
      case 'combat':
      case 'attack':
        return '⚔️';
      case 'transfer':
        return '🔄';
      case 'collectresource':
        return '💰';
      case 'endturn':
        return '🏁';
      default:
        return '❓';
    }
  };

  // Función para obtener una descripción legible de la acción
  const getActionDescription = (action: AIAction): string => {
    const details = action.details || {};
    const type = action.action?.toLowerCase();
    
    if (action.error) {
      return `Error: ${action.error}`;
    }

    switch (type) {
      case 'movehero':
        return `Movió héroe a (${details.destination?.x}, ${details.destination?.y})`;
      case 'buildstructure':
        return `Construyó ${details.structureType || 'estructura'} en ciudad`;
      case 'recruitunits':
        return `Reclutó ${details.count || details.amount || 0} ${details.unitType || 'unidades'}`;
      case 'combat':
      case 'attack':
        return `Atacó a un héroe enemigo`;
      case 'transfer':
        return `Transfirió tropas entre héroe y castillo`;
      case 'collectresource':
        return `Recolectó recursos`;
      case 'endturn':
        return 'Finalizó su turno';
      default:
        return `Acción: ${action.action || 'desconocida'}`;
    }
  };

  return (
    <div className="ai-actions-summary">
      <div className="ai-summary-header">
        <h2>Resumen de Acciones de la IA</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      {strategicInfo && (
        <div className="ai-strategic-info">
          <h3>Estrategia de la IA</h3>
          {Object.entries(strategicInfo).map(([key, value]) => (
            <div key={key} className="strategic-item">
              <h4>{key === 'reasoning' ? 'Razonamiento' : 
                  key === 'strategic_planning' ? 'Planificación Estratégica' : 
                  key === 'analysis' ? 'Análisis' : key}</h4>
              <p>{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="ai-actions-list">
        <h3>Acciones Realizadas</h3>
        {actions.length === 0 ? (
          <p className="no-actions">No se han realizado acciones</p>
        ) : (
          <ul>
            {actions.map((action, index) => (
              <li key={index} className={`action-item ${action.error ? 'action-error' : ''}`}>
                <div className="action-icon">{getActionIcon(action.action)}</div>
                <div className="action-content">
                  <div className="action-title">{action.action}</div>
                  <div className="action-description">{getActionDescription(action)}</div>
                  {action.result && !action.error && (
                    <div className="action-result">
                      {typeof action.result === 'object' 
                        ? Object.entries(action.result)
                            .filter(([k, v]) => k !== 'success' && v !== undefined)
                            .map(([key, value]) => (
                              <span key={key}>{key}: {JSON.stringify(value)}</span>
                            ))
                        : action.result}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AIActionsSummary;
