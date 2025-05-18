import React, { useState, useEffect } from 'react';
import './BuildingConstructionMenu.css';

interface BuildingConstructionMenuProps {
  onClose: () => void;
  buildCosts: {
    [key: string]: {
      gold: number;
      wood: number;
      stone: number;
    };
  };
  onBuildStructure: (structureType: string) => Promise<any>;
  playerResources: {
    gold: number;
    wood: number;
    stone: number;
  };
  builtBuildings: string[];
  refreshResources: () => void;
}

const BuildingConstructionMenu: React.FC<BuildingConstructionMenuProps> = ({
  onClose,
  buildCosts,
  onBuildStructure,
  playerResources,
  builtBuildings = [],
  refreshResources
}) => {
  const [isBuilding, setIsBuilding] = useState<string | null>(null);
  const [localBuiltBuildings, setLocalBuiltBuildings] = useState<string[]>(builtBuildings);
  const [localResources, setLocalResources] = useState(playerResources);

  // Update when props change
  useEffect(() => {
    setLocalBuiltBuildings(builtBuildings);
  }, [builtBuildings]);

  useEffect(() => {
    setLocalResources(playerResources);
  }, [playerResources]);

  const handleBuild = async (buildingType: string) => {
    try {
      setIsBuilding(buildingType);
      const response = await onBuildStructure(buildingType);
      
      console.log("Build response:", response);
      
      if (response && response.success) {
        // Update local state
        if (response.new_resources) {
          setLocalResources(response.new_resources);
        }
        
        // Add to built buildings list
        setLocalBuiltBuildings(prev => [...prev, buildingType]);
        
        // Refresh parent resources
        refreshResources();
      }
    } catch (error) {
      console.error("Error building structure:", error);
    } finally {
      setIsBuilding(null);
    }
  };

  const isAlreadyBuilt = (buildingType: string) => {
    return localBuiltBuildings.includes(buildingType);
  };

  const canBuild = (buildingType: string, cost: any) => {
    if (isAlreadyBuilt(buildingType)) return false;
    
    return localResources.gold >= cost.gold &&
           localResources.wood >= cost.wood &&
           localResources.stone >= cost.stone;
  };

  return (
    <div className="building-menu">
      <h2>Construcción de Edificios</h2>
      <div className="buildings-list">
        {Object.entries(buildCosts).map(([buildingType, cost]) => {
          // Skip castle
          if (buildingType === 'castle') return null;
          
          const built = isAlreadyBuilt(buildingType);
          const canBuildThisStructure = canBuild(buildingType, cost);
          const currentlyBuilding = isBuilding === buildingType;

          return (
            <div 
              key={buildingType} 
              className={`building-option ${built ? 'built-building' : ''}`}
              data-type={buildingType}
              style={built ? {backgroundColor: 'rgba(76, 175, 80, 0.2)', borderColor: '#4CAF50'} : {}}
            >
              <h3>{formatBuildingName(buildingType)}</h3>
              <div className="building-costs">
                <p>Coste:</p>
                <ul>
                  {cost.gold > 0 && (
                    <li className={localResources.gold < cost.gold ? "insufficient" : ""}>
                      Oro: {cost.gold} (Tienes: {localResources.gold})
                    </li>
                  )}
                  {cost.wood > 0 && (
                    <li className={localResources.wood < cost.wood ? "insufficient" : ""}>
                      Madera: {cost.wood} (Tienes: {localResources.wood})
                    </li>
                  )}
                  {cost.stone > 0 && (
                    <li className={localResources.stone < cost.stone ? "insufficient" : ""}>
                      Piedra: {cost.stone} (Tienes: {localResources.stone})
                    </li>
                  )}
                </ul>
              </div>
              <button 
                onClick={() => handleBuild(buildingType)}
                disabled={!canBuildThisStructure || currentlyBuilding || built}
                className={built ? "already-built" : (canBuildThisStructure ? (currentlyBuilding ? "building-in-progress" : "can-build") : "cannot-build")}
              >
                {built ? "Construido" : (currentlyBuilding ? "Construyendo..." : "Construir")}
              </button>
            </div>
          );
        })}
      </div>
      <button className="close-button" onClick={onClose}>Cerrar</button>
    </div>
  );
};

// Fixed the spelling of 'knights_tower' (was incorrectly spelled 'knigths_tower')
const formatBuildingName = (type: string): string => {
  const names: { [key: string]: string } = {
    'barracks': 'Cuartel',
    'archery': 'Campo de Tiro',
    'knights_tower': 'Torre de Caballeros',
    'mage_tower': 'Torre de Magos',
    'dragons_lair': 'Guarida de Dragones',
    'tavern': 'Taberna'
  };
  return names[type] || type;
};

export default BuildingConstructionMenu;
