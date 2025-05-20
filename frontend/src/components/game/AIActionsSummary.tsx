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
  strategicInfo?: Record<string, any>;
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
        return `Recolectó recurso de tipo ${details.resourceType || 'desconocido'}`;
      case 'endturn':
        return 'Finalizó su turno';
      default:
        return `Acción: ${action.action || 'desconocida'}`;
    }
  };

  // Filtrar solo las acciones exitosas (sin error)
  const successfulActions = actions.filter(action => !action.error);

  // Función para formatear claves de estrategia a nombres legibles
  const formatStrategyKey = (key: string): string => {
    const keyMap: Record<string, string> = {
      'reasoning': 'Razonamiento',
      'strategic_planning': 'Planificación Estratégica',
      'analysis': 'Análisis',
      'summary': 'Resumen',
      'opportunities': 'Oportunidades',
      'threats': 'Amenazas',
      'prioritized_objectives': 'Objetivos Prioritarios',
      'short_term_strategy': 'Estrategia a Corto Plazo',
      'long_term_strategy': 'Estrategia a Largo Plazo'
    };
    return keyMap[key] || key;
  };

  // Función recursiva para renderizar valores estratégicos de cualquier tipo
  const renderStrategyValue = (value: any): React.ReactNode => {
    if (typeof value === 'string') {
      return <p>{value}</p>;
    } else if (Array.isArray(value)) {
      return (
        <ul className="strategy-list">
          {value.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      );
    } else if (typeof value === 'object' && value !== null) {
      return (
        <div className="nested-strategy">
          {Object.entries(value).map(([subKey, subValue]) => (
            <div key={subKey} className="strategy-subitem">
              <h5>{formatStrategyKey(subKey)}</h5>
              {renderStrategyValue(subValue)}
            </div>
          ))}
        </div>
      );
    }
    return <p>{String(value)}</p>;
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
              <h4>{formatStrategyKey(key)}</h4>
              {renderStrategyValue(value)}
            </div>
          ))}
        </div>
      )}

      <div className="ai-actions-list">
        <h3>Acciones Realizadas</h3>
        {successfulActions.length === 0 ? (
          <p className="no-actions">No se han realizado acciones exitosas</p>
        ) : (
          <ul>
            {successfulActions.map((action, index) => (
              <li key={index} className="action-item">
                <div className="action-icon">{getActionIcon(action.action)}</div>
                <div className="action-content">
                  <div className="action-title">{action.action}</div>
                  <div className="action-description">{getActionDescription(action)}</div>
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
