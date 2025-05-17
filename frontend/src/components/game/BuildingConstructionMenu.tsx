import React from 'react';
import { Building } from '../../types/game';
import Button from '../ui/Button';
import '../../styles/components/BuildingConstructionMenu.css';

interface BuildingConstructionMenuProps {
  availableBuildings: Building[];
  onBuild: (buildingType: string) => void; // Update type to be explicit
  onClose: () => void;
  playerResources: { gold: number; wood: number; stone: number };
}

const BuildingConstructionMenu: React.FC<BuildingConstructionMenuProps> = ({
  availableBuildings,
  onBuild,
  onClose,
  playerResources
}) => {
  const buildingConfigs = {
    barracks: { 
      name: "Cuartel", 
      cost: { gold: 1000, wood: 50, stone: 50 },
      cityId: "barracks_city"
    },
    archery: { 
      name: "Campo de Tiro", 
      cost: { gold: 1200, wood: 70, stone: 30 },
      cityId: "archery_city"
    },
    knights_tower: { 
      name: "Torre de Caballeros", 
      cost: { gold: 1500, wood: 100, stone: 100 },
      cityId: "knights_city"
    },
    mage_tower: { 
      name: "Torre de Magos", 
      cost: { gold: 2000, wood: 100, stone: 100 },
      cityId: "mage_city"
    },
    dragons_lair: { 
      name: "Guarida de Dragones", 
      cost: { gold: 5000, wood: 200, stone: 200 },
      cityId: "dragon_city"
    }
  };

  const canAfford = (cost: any = {}) => {
    if (!cost) return false;
    return Object.entries(cost || {}).every(([resource, amount]) => 
      (playerResources[resource as keyof typeof playerResources] || 0) >= (amount as number)
    );
  };

  return (
    <div className="building-construction-menu">
      <div className="construction-header">
        <h3>Construir Edificios</h3>
        <button onClick={onClose}>×</button>
      </div>

      <div className="construction-content">
        {Object.entries(buildingConfigs).map(([type, building]) => (
          <div key={type} className="building-option">
            <div className="building-info">
              <span>{building.name}</span>
              <div className="cost-info">
                {Object.entries(building.cost).map(([resource, amount]) => (
                  <span key={resource}>{resource}: {amount}</span>
                ))}
              </div>
            </div>
            <Button
              onClick={() => {
                console.log(`Building ${type} in city ${building.cityId}`);
                onBuild(type);
              }}
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

export default BuildingConstructionMenu;
