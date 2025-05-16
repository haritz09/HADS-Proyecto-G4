import React from 'react';
import { Building } from '../../types/game';
import '../../styles/components/BuildingInfo.css';

interface BuildingInfoProps {
  building: Building;
  onClose: () => void;
}

const BuildingInfo: React.FC<BuildingInfoProps> = ({ building, onClose }) => {
  return (
    <div className="building-info">
      <div className="building-info-header">
        <h3>{building.name}</h3>
        <button onClick={onClose}>×</button>
      </div>
      
      <div className="building-info-content">
        <div className="building-status">
          <span>Estado: {building.built ? 'Construido' : 'Sin construir'}</span>
          {building.built && building.can_recruit && <span>Puede reclutar tropas</span>}
        </div>
        
        {!building.built && building.cost && (
          <div className="building-cost">
            <h4>Coste de construcción:</h4>
            <ul>
              {Object.entries(building.cost || {}).map(([resource, amount]) => (
                <li key={resource}>{resource}: {amount}</li>
              ))}
            </ul>
          </div>
        )}
        
        {building.available_creatures && building.available_creatures.length > 0 && (
          <div className="available-units">
            <h4>Unidades disponibles:</h4>
            <ul>
              {building.available_creatures.map(creature => (
                <li key={creature.type}>
                  {creature.type}: {creature.count} disponibles
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuildingInfo;
