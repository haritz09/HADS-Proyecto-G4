import React, { useState } from 'react';
import { Building } from '../../types/game';
import Button from '../ui/Button';

interface Resources {
  gold: number;
  wood: number;
  stone: number;
}

interface ConstructionMenuProps {
  onClose: () => void;
  onBuild: (buildingId: string) => Promise<void>; // Cambiado a Promise<void>
  availableBuildings: Building[];
  playerResources: Resources;
}

const ConstructionMenu: React.FC<ConstructionMenuProps> = ({
  onClose,
  onBuild,
  availableBuildings,
  playerResources
}) => {
  const [buildingInProgress, setBuildingInProgress] = useState<string | null>(null);

  const canAfford = (cost: Partial<Resources>) => {
    return Object.entries(cost).every(([resource, amount]) => {
      const typedResource = resource as keyof Resources;
      const typedAmount = amount as number;
      return playerResources[typedResource] >= typedAmount;
    });
  };

  const handleBuild = async (buildingId: string) => {
    try {
      setBuildingInProgress(buildingId);
      await onBuild(buildingId);
      // No cerramos el menú para permitir construir múltiples edificios
    } catch (error) {
      console.error("Error al construir:", error);
    } finally {
      setBuildingInProgress(null);
    }
  };

  return (
    <div className="construction-menu">
      <div className="construction-header">
        <h3>Construir Edificios</h3>
        <button onClick={onClose}>×</button>
      </div>
      
      <div className="construction-content">
        {availableBuildings.map(building => {
          const isBuilding = buildingInProgress === building.id;
          return (
            <div key={building.id} className="building-option">
              <div className="building-info">
                <h4>{building.name}</h4>
                <div className="cost-info">
                  {Object.entries(building.cost).map(([resource, amount]) => (
                    <span key={resource} className={playerResources[resource as keyof Resources] >= amount ? 'affordable' : 'unaffordable'}>
                      {resource}: {amount} 
                      ({playerResources[resource as keyof Resources]})
                    </span>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => handleBuild(building.id)}
                disabled={!canAfford(building.cost) || isBuilding}
              >
                {isBuilding ? "Construyendo..." : "Construir"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConstructionMenu;
