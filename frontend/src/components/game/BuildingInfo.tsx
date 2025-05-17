import React from 'react';
import { Building } from '../../types/game';
import Button from '../ui/Button';
import '../../styles/components/BuildingInfo.css';

interface BuildingInfoProps {
  building: Building;
  onClose: () => void;
  onBuild?: (buildingId: string) => Promise<void>;
  canBuild?: boolean;
  showBuildOptions?: boolean;
  playerResources?: { gold: number; wood: number; stone: number };
}

const BuildingInfo: React.FC<BuildingInfoProps> = ({
  building,
  onClose,
  onBuild,
  canBuild,
  showBuildOptions,
  playerResources
}) => {
  if (!building) {
    return <div>No hay información disponible del edificio</div>;
  }

  const cost = building.cost || { gold: 0, wood: 0, stone: 0 };
  const canAfford = playerResources && Object.entries(cost).every(
    ([resource, amount]) => playerResources[resource as keyof typeof playerResources] >= amount
  );

  return (
    <div className="building-info-panel">
      <div className="building-info-header">
        <h3>{building.name || 'Edificio desconocido'}</h3>
        <button onClick={onClose}>×</button>
      </div>

      <div className="building-info-content">
        <div className="building-status">
          <p>Estado: {building.built ? 'Construido' : 'Sin construir'}</p>
          {building.is_castle && <p><strong>¡Edificio principal!</strong></p>}
          {building.can_recruit && <p>Permite reclutar unidades</p>}
        </div>

        {!building.built && (
          <div className="building-cost">
            <h4>Coste de construcción:</h4>
            {Object.entries(cost).map(([resource, amount]) => (
              <div key={resource} className="resource-cost">
                <span>{resource}: {amount}</span>
                {playerResources && (
                  <span className={playerResources[resource as keyof typeof playerResources] >= amount ? 'sufficient' : 'insufficient'}>
                    (Tienes: {playerResources[resource as keyof typeof playerResources]})
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {showBuildOptions && !building.built && (
          <Button
            onClick={() => onBuild?.(building.id)}
            disabled={!canBuild || !canAfford}
            className="build-button"
          >
            Construir
          </Button>
        )}

        {building.built && building.can_recruit && building.available_creatures && building.available_creatures.length > 0 ? (
          <div className="available-units">
            <h4>Unidades disponibles:</h4>
            <ul>
              {building.available_creatures.map((creature, index) => (
                <li key={index}>
                  {creature.type}: {creature.count} disponibles
                  {creature.recruit_cost && (
                    <span> (Costo: {Object.entries(creature.recruit_cost || {}).map(([res, amt]) => 
                      `${res}: ${amt}`).join(', ')})</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p>No hay unidades disponibles para reclutar.</p>
        )}
      </div>
    </div>
  );
};

export default BuildingInfo;
