/*
* Componente para la vista de ciudad
* Implementar:
* - Vista de edificios existentes y construibles
* - Reclutamiento de unidades
* - Gestión de guarnición
* - Producción de recursos
*/

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { City, Resources, Unit, Building, Hero, ArmyUnit } from '../../types/game';
import Button from '../ui/Button';
import '../../styles/components/CityView.css';

interface CityViewProps {
  city: City;
  playerResources: Resources;
  heroes: Hero[];
  onBuildBuilding: (buildingId: string) => void;
  onRecruitUnits: (unitId: string, amount: number, heroId?: string) => void;
  onClose: () => void;
}

const CityView: React.FC<CityViewProps> = ({
  city,
  playerResources,
  heroes,
  onBuildBuilding,
  onRecruitUnits,
  onClose
}) => {
  // Estado para el héroe seleccionado para reclutar unidades
  const [selectedHeroId, setSelectedHeroId] = useState<string | 'garrison'>('garrison');
  
  // Estado para la cantidad de unidades a reclutar
  const [recruitAmounts, setRecruitAmounts] = useState<{[unitId: string]: number}>({});
  
  // Comprobar si hay suficientes recursos para construir un edificio
  const canBuildBuilding = (building: Building): boolean => {
    if (building.built) return false;
    
    // Comprobar si se cumplen los requisitos previos
    const allRequirementsMet = building.requirements.every(reqId => {
      return city.buildings.some(b => b.id === reqId && b.built);
    });
    
    if (!allRequirementsMet) return false;
    
    // Comprobar si hay suficientes recursos
    return Object.entries(building.cost).every(([resource, amount]) => {
      return playerResources[resource as keyof Resources] >= (amount || 0);
    });
  };
  
  // Comprobar cuántas unidades pueden reclutarse con los recursos disponibles
  const getMaxRecruitableAmount = (unitId: string): number => {
    const unit = city.availableUnits.find(u => u.unitId === unitId);
    if (!unit || unit.amount <= 0) return 0;
    
    // Obtener el edificio que produce esta unidad
    const building = city.buildings.find(b => 
      b.built && b.can_recruit && b.available_creatures.some(c => c.type === unitId)
    );
    
    if (!building) return 0;
    
    const creature = building.available_creatures.find(c => c.type === unitId);
    if (!creature) return 0;
    
    let maxAmount = Math.min(unit.amount, creature.count);
    
    // Corregir: Asegurarse de que unit_cost existe antes de usar Object.entries
    if (creature.unit_cost) {
      Object.entries(creature.unit_cost).forEach(([resource, cost]) => {
        if (cost && typeof cost === 'number' && cost > 0) {
          const resourceKey = resource as keyof Resources;
          const affordableAmount = Math.floor(playerResources[resourceKey] / cost);
          maxAmount = Math.min(maxAmount, affordableAmount);
        }
      });
    }
    
    return maxAmount;
  };

  // Maneja el cambio en la cantidad de unidades a reclutar
  const handleRecruitAmountChange = (unitId: string, amount: number) => {
    setRecruitAmounts(prev => ({
      ...prev,
      [unitId]: amount
    }));
  };

  // Ejecuta el reclutamiento de unidades
  const handleRecruitUnits = (unitId: string) => {
    const amount = recruitAmounts[unitId] || 0;
    if (amount <= 0) return;
    
    const heroId = selectedHeroId !== 'garrison' ? selectedHeroId : undefined;
    onRecruitUnits(unitId, amount, heroId);
    
    // Resetear la cantidad tras reclutar
    handleRecruitAmountChange(unitId, 0);
  };

  return (
    <div className="city-view">
      <div className="city-header">
        <h2>{city.name}</h2>
        <Button variant="secondary" size="small" onClick={onClose}>X</Button>
      </div>
      
      <div className="city-content">
        <div className="city-buildings">
          <h3>Edificios</h3>
          <div className="buildings-grid">
            {city.buildings.map(building => (
              <div 
                key={building.id} 
                className={`building-tile ${building.built ? 'built' : ''} ${canBuildBuilding(building) ? 'can-build' : ''}`}
                onClick={() => {
                  if (!building.built && canBuildBuilding(building)) {
                    onBuildBuilding(building.id);
                  }
                }}
              >
                <div className="building-icon"></div>
                <div className="building-name">{building.name}</div>
                {!building.built && (
                  <div className="building-cost">
                    {Object.entries(building.cost).map(([resource, amount]) => (
                      <div key={resource} className="resource-cost">
                        <div className={`resource-icon ${resource}-icon`}></div>
                        <span>{amount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="city-recruitment">
          <h3>Reclutar Unidades</h3>
          
          <div className="recruitment-target">
            <label>Reclutar para:</label>
            <select 
              value={selectedHeroId} 
              onChange={(e) => setSelectedHeroId(e.target.value)}
            >
              <option value="garrison">Guarnición</option>
              {heroes.map(hero => (
                <option key={hero.id} value={hero.id}>{hero.name}</option>
              ))}
            </select>
          </div>
          
          <div className="available-units">
            {city.availableUnits.map(availableUnit => {
              const unitId = availableUnit.unitId;
              const maxAmount = getMaxRecruitableAmount(unitId);
              
              // Encontrar el edificio que produce esta unidad para obtener más información
              const building = city.buildings.find(b => 
                b.built && b.can_recruit && b.available_creatures.some(c => c.type === unitId)
              );
              
              if (!building) return null;
              
              const creature = building.available_creatures.find(c => c.type === unitId);
              if (!creature) return null;
              
              return (
                <div key={unitId} className="unit-recruitment">
                  <div className="unit-icon"></div>
                  <div className="unit-details">
                    <div className="unit-name">{creature.type || 'Unidad'}</div>
                    <div className="unit-available">Disponibles: {availableUnit.amount}</div>
                    <div className="unit-cost">
                      {creature.unit_cost ? (
                        Object.entries(creature.unit_cost).map(([resource, amount]) => (
                          <div key={resource} className="resource-cost">
                            <div className={`resource-icon ${resource}-icon`}></div>
                            <span>{String(amount)}</span>
                          </div>
                        ))
                      ) : (
                        <p>Costo no disponible</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="recruitment-controls">
                    <input 
                      type="number" 
                      min="0" 
                      max={maxAmount} 
                      value={recruitAmounts[unitId] || 0} 
                      onChange={(e) => handleRecruitAmountChange(unitId, Math.min(maxAmount, parseInt(e.target.value) || 0))}
                    />
                    <Button 
                      variant="primary" 
                      size="small" 
                      disabled={(recruitAmounts[unitId] || 0) <= 0}
                      onClick={() => handleRecruitUnits(unitId)}
                    >
                      Reclutar
                    </Button>
                  </div>
                </div>
              );
            })}
            
            {city.availableUnits.length === 0 && (
              <div className="no-units">No hay unidades disponibles para reclutar</div>
            )}
          </div>
        </div>
        
        <div className="city-garrison">
          <h3>Guarnición</h3>
          <div className="garrison-units">
            {city.garrison.length > 0 ? (
              city.garrison.map((unit: ArmyUnit) => (
                <div key={`${unit.type}-${unit.count}`} className="garrison-unit">
                  <div className="unit-icon"></div>
                  <div className="unit-info">
                    <div className="unit-name">{unit.type}</div>
                    <div className="unit-quantity">{unit.count}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-garrison">La guarnición está vacía</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

CityView.propTypes = {
  city: PropTypes.shape({
    name: PropTypes.string.isRequired,
    buildings: PropTypes.arrayOf(PropTypes.object).isRequired,
    availableUnits: PropTypes.arrayOf(PropTypes.object).isRequired,
    garrison: PropTypes.arrayOf(PropTypes.object).isRequired
  }).isRequired,
  playerResources: PropTypes.object.isRequired,
  heroes: PropTypes.arrayOf(PropTypes.object).isRequired,
  onBuildBuilding: PropTypes.func.isRequired,
  onRecruitUnits: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

export default CityView;
