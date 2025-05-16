import React from 'react';
import { Building } from '../../types/game';
import Button from '../ui/Button';

interface Resources {
  gold: number;
  wood: number;
  stone: number;
}

interface ConstructionMenuProps {
  onClose: () => void;
  onBuild: (buildingId: string) => void;
  availableBuildings: Building[];
  playerResources: Resources;
}

const ConstructionMenu: React.FC<ConstructionMenuProps> = ({
  onClose,
  onBuild,
  availableBuildings,
  playerResources
}) => {
  const canAfford = (cost: Partial<Resources>) => {
    return Object.entries(cost).every(([resource, amount]) => {
      const typedResource = resource as keyof Resources;
      const typedAmount = amount as number;
      return playerResources[typedResource] >= typedAmount;
    });
  };

  return (
    <div className="construction-menu">
      <div className="construction-header">
        <h3>Construir Edificios</h3>
        <button onClick={onClose}>×</button>
      </div>
      
      <div className="construction-content">
        {availableBuildings.map(building => (
          <div key={building.id} className="building-option">
            <div className="building-info">
              <h4>{building.name}</h4>
              <div className="cost-info">
                {Object.entries(building.cost).map(([resource, amount]) => (
                  <span key={resource}>
                    {resource}: {amount} 
                    ({playerResources[resource as keyof Resources]})
                  </span>
                ))}
              </div>
            </div>
            <Button
              onClick={() => onBuild(building.id)}
              disabled={!canAfford(building.cost)}
            >
              Construir
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConstructionMenu;
