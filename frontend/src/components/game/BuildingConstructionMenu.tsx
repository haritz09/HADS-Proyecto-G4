import React, { useEffect, useState } from 'react';
import { Building } from '../../types/game';
import Button from '../ui/Button';
import '../../styles/components/BuildingConstructionMenu.css';

interface BuildingConstructionMenuProps {
  availableBuildings: Building[];
  onBuild: (buildingType: string) => void;
  onClose: () => void;
  playerResources: { gold: number; wood: number; stone: number };
  gameState: any; // Add gameState to check ownership
}

const BuildingConstructionMenu: React.FC<BuildingConstructionMenuProps> = ({
  availableBuildings,
  onBuild,
  onClose,
  playerResources,
  gameState
}) => {
  const [ownedBuildings, setOwnedBuildings] = useState<Record<string, string>>({});
  
  useEffect(() => {
    // Create a map of building type to owner
    const owned: Record<string, string> = {};
    
    // Check both player and AI cities for ownership
    if (gameState) {
      // Check player cities
      if (gameState.player && gameState.player.cities) {
        gameState.player.cities.forEach((city: any) => {
          if (city.buildings) {
            city.buildings.forEach((building: any) => {
              // Comprobar tanto el building_type como otros posibles nombres
              if (building.built && building.owner === "player") {
                owned[building.building_type] = "player";
                
                // Agregar mapeo auxiliar para casos especiales
                if (building.building_type === 'knights_tower') owned['knights'] = "player";
                if (building.building_type === 'dragons_lair') owned['dragon'] = "player";
              }
            });
          }
        });
      }
      
      // Check AI cities - similar logic as above
      if (gameState.ai && gameState.ai.cities) {
        gameState.ai.cities.forEach((city: any) => {
          if (city.buildings) {
            city.buildings.forEach((building: any) => {
              if (building.built && building.owner === "ai") {
                owned[building.building_type] = "ai";
                
                // Similar mapping for AI buildings
                if (building.building_type === 'knights_tower') owned['knights'] = "ai";
                if (building.building_type === 'dragons_lair') owned['dragon'] = "ai";
              }
            });
          }
        });
      }
    }
    
    setOwnedBuildings(owned);
  }, [gameState]);

  // Add debug logging to help troubleshoot ownership issues
  useEffect(() => {
    if (gameState && gameState.player && gameState.player.cities) {
      console.log("BuildingConstructionMenu: Checking building ownership...");
      
      // Log all buildings with their ownership status
      gameState.player.cities.forEach((city: any) => {
        if (city.buildings) {
          city.buildings.forEach((building: any) => {
            console.log(`Building: ${building.building_type}, built: ${building.built}, owner: ${building.owner || 'None'}`);
          });
        }
      });
      
      console.log("Owned buildings map:", ownedBuildings);
    }
  }, [ownedBuildings, gameState]);

  const buildingConfigs = {
    barracks: { 
      name: "Cuartel", 
      cost: { gold: 1000, wood: 50, stone: 50 }
    },
    archery: { 
      name: "Campo de Tiro", 
      cost: { gold: 1200, wood: 70, stone: 30 }
    },
    knights_tower: { 
      name: "Torre de Caballeros", 
      cost: { gold: 1500, wood: 100, stone: 100 }
    },
    mage_tower: { 
      name: "Torre de Magos", 
      cost: { gold: 2000, wood: 100, stone: 100 }
    },
    dragons_lair: { 
      name: "Guarida de Dragones", 
      cost: { gold: 5000, wood: 200, stone: 200 }
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
        {Object.entries(buildingConfigs).map(([type, building]) => {
          const isOwnedByPlayer = ownedBuildings[type] === "player";
          const isOwnedByAI = ownedBuildings[type] === "ai";
          
          return (
            <div key={type} className="building-option">
              <div className="building-info">
                <span>{building.name}</span>
                <div className="cost-info">
                  {Object.entries(building.cost).map(([resource, amount]) => (
                    <span key={resource} className={canAfford({ [resource]: amount }) ? 'affordable' : 'unaffordable'}>
                      {resource}: {amount}
                    </span>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => onBuild(type)}
                disabled={!canAfford(building.cost) || isOwnedByPlayer}
                className={isOwnedByPlayer ? "owned" : ""}
              >
                {isOwnedByPlayer ? "Comprado" : isOwnedByAI ? "Construir" : "Construir"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BuildingConstructionMenu;
