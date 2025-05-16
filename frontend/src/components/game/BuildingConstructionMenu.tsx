import React from 'react';
import { Building } from '../../types/game';
import Button from '../ui/Button';
import '../../styles/components/BuildingConstructionMenu.css';

interface BuildingConstructionMenuProps {
  availableBuildings: Building[];
  onBuild: (buildingId: string) => void;
  onClose: () => void;
  playerResources: { gold: number; wood: number; stone: number };
}

const BuildingConstructionMenu: React.FC<BuildingConstructionMenuProps> = ({
  availableBuildings,
  onBuild,
  onClose,
  playerResources
}) => {
  const canAfford = (cost: any) => {
    return Object.entries(cost).every(([resource, amount]) => 
      playerResources[resource as keyof typeof playerResources] >= (amount as number)
    );
  };

  return (
    <div className="building-construction-menu">
      <div className="construction-header">
        <h3>Construir Edificios</h3>
        <button onClick={onClose}>×</button>
      </div>

      <div className="construction-content">
        {availableBuildings.map(building => (
          <div key={building.id} className="building-option">
            <div className="building-info">
              <span>{building.name}</span>
              <div className="cost-info">
                {Object.entries(building.cost).map(([resource, amount]) => (
                  <span key={resource}>{resource}: {amount}</span>
                ))}
              </div>
            </div>
            <Button
              onClick={() => onBuild(building.id)}
              disabled={building.built || !canAfford(building.cost)}
            >
              {building.built ? 'Construido' : 'Construir'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BuildingConstructionMenu;
