import React from 'react';
import '../../styles/components/PlayerInteractionSummary.css';

interface PlayerInteractionSummaryProps {
  isVisible: boolean;
  onClose: () => void;
  interactionData: {
    interaction: string;
    [key: string]: any;
  } | null;
}

/**
 * Component that shows a summary of player interactions with artifacts and mines
 */
const PlayerInteractionSummary: React.FC<PlayerInteractionSummaryProps> = ({
  isVisible,
  onClose,
  interactionData
}) => {
  if (!isVisible || !interactionData) return null;

  // Get appropriate icon based on interaction type
  const getInteractionIcon = (): string => {
    const interactionType = interactionData.interaction;
    
    switch (interactionType) {
      case 'artifact_collected': {
        const subtype = interactionData.subtype;
        if (subtype === 'totemDeGuerra') return '⚔️';
        if (subtype === 'totemVelocidad') return '⚡';
        if (subtype === 'totemReclutamiento') return '💰';
        return '🏆';
      }
        
      case 'resource_site_captured': {
        const resourceType = interactionData.resource_type || '';
        if (resourceType === 'gold') return '💰';
        if (resourceType === 'wood') return '🪵';
        if (resourceType === 'stone') return '⛏️';
        return '🏭';
      }
        
      default:
        return '❓';
    }
  };

  // Get detailed description of the interaction
  const getInteractionDescription = (): string => {
    const interactionType = interactionData.interaction;
    
    switch (interactionType) {
      case 'artifact_collected': {
        const artifactName = interactionData.artifact || 'artefacto';
        const subtype = interactionData.subtype || '';
        
        let effectDescription = 'poderes mágicos desconocidos';
        if (subtype === 'totemDeGuerra') {
          effectDescription = 'aumenta el ataque, defensa y salud de tus tropas en un 20%';
        } else if (subtype === 'totemVelocidad') {
          effectDescription = 'incrementa los puntos de movimiento en un 30%';
        } else if (subtype === 'totemReclutamiento') {
          effectDescription = 'reduce el costo de reclutamiento de tropas en un 30%';
        }
        
        return `Has encontrado el ${artifactName}. Este artefacto ${effectDescription}.`;
      }
      
      case 'resource_site_captured': {
        const resourceType = interactionData.resource_type || 'recurso';
        const resourcePerTurn = interactionData.resource_per_turn || 0;
        
        let resourceName;
        switch (resourceType) {
          case 'gold': resourceName = 'oro'; break;
          case 'wood': resourceName = 'madera'; break;
          case 'stone': resourceName = 'piedra'; break;
          default: resourceName = resourceType;
        }
        
        return `Has capturado una mina de ${resourceName}. Recibirás +${resourcePerTurn} de ${resourceName} por turno.`;
      }
      
      default:
        return 'Interacción desconocida';
    }
  };

  // Get a title for the interaction
  const getInteractionTitle = (): string => {
    const interactionType = interactionData.interaction;
    
    switch (interactionType) {
      case 'artifact_collected':
        return '¡Artefacto Encontrado!';
      case 'resource_site_captured':
        return '¡Mina Capturada!';
      default:
        return 'Interacción';
    }
  };

  const getInteractionClass = (): string => {
    return interactionData.interaction === 'artifact_collected' 
      ? 'interaction-summary-artifact' 
      : 'interaction-summary-resource';
  };

  return (
    <div className={`player-interaction-summary ${getInteractionClass()}`}>
      <div className="interaction-summary-header">
        <h2>{getInteractionTitle()}</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="interaction-content">
        <div className="interaction-icon">{getInteractionIcon()}</div>
        <p className="interaction-description">{getInteractionDescription()}</p>
        
        {interactionData.interaction === 'resource_site_captured' && (
          <div className="resource-income">
            <span>+{interactionData.resource_per_turn || 0} por turno</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerInteractionSummary;
