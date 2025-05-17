import React from 'react';
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
  onBuildStructure: (structureType: string) => void;
  playerResources: {
    gold: number;
    wood: number;
    stone: number;
  };
}

const BuildingConstructionMenu: React.FC<BuildingConstructionMenuProps> = ({
  onClose,
  buildCosts,
  onBuildStructure,
  playerResources
}) => {
  return (
    <div className="building-menu">
      <h2>Construcción de Edificios</h2>
      <div className="buildings-list">
        {Object.entries(buildCosts).map(([buildingType, cost]) => {
          // Excluir el castillo del menú
          if (buildingType === 'castle') return null;
          
          // Verificar si tenemos recursos suficientes
          const canBuild = playerResources.gold >= cost.gold &&
                          playerResources.wood >= cost.wood &&
                          playerResources.stone >= cost.stone;

          return (
            <div key={buildingType} className="building-option">
              <h3>{formatBuildingName(buildingType)}</h3>
              <div className="building-costs">
                <p>Coste:</p>
                <ul>
                  {cost.gold > 0 && <li>Oro: {cost.gold}</li>}
                  {cost.wood > 0 && <li>Madera: {cost.wood}</li>}
                  {cost.stone > 0 && <li>Piedra: {cost.stone}</li>}
                </ul>
              </div>
              <button 
                onClick={() => onBuildStructure(buildingType)}
                disabled={!canBuild}
                className={canBuild ? 'can-build' : 'cannot-build'}
              >
                Construir
              </button>
            </div>
          );
        })}
      </div>
      <button className="close-button" onClick={onClose}>Cerrar</button>
    </div>
  );
};

const formatBuildingName = (type: string): string => {
  const names: { [key: string]: string } = {
    'barracks': 'Cuartel',
    'archery': 'Campo de Tiro',
    'knigths_tower': 'Torre de Caballeros',
    'mage_tower': 'Torre de Magos',
    'dragons_lair': 'Guarida de Dragones',
    'tavern': 'Taberna'
  };
  return names[type] || type;
};

export default BuildingConstructionMenu;
