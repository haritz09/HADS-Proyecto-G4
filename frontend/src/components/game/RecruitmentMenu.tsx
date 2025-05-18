import React, { useState, useEffect } from 'react';
import { Building, Hero, Resources, AvailableCreature } from '../../types/game';
import Button from '../ui/Button';
import '../../styles/components/RecruitmentMenu.css';

interface RecruitmentMenuProps {
  building: Building;
  hero: Hero;
  onRecruit: (unitType: string, amount: number) => void;
  onClose: () => void;
}

const RecruitmentMenu: React.FC<RecruitmentMenuProps> = ({ building, hero, onRecruit, onClose }) => {
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  
  // Log available creatures for debugging
  useEffect(() => {
    console.log('RecruitmentMenu: Available creatures:', building.available_creatures);
  }, [building]);
  
  const getUnitCost = (creature: any, quantity: number): Resources => {
    // Manejar diferentes formatos de costo (unit_cost o directamente en las propiedades)
    let costSource = creature.unit_cost;
    
    // Si unit_cost no existe, intentamos buscar en recruit_cost (para compatibilidad)
    if (!costSource && creature.recruit_cost) {
      costSource = creature.recruit_cost;
    }
    
    // Si aún no hay costo, intentar obtener un objeto con valor por defecto
    if (!costSource) {
      // Buscar propiedades que podrían contener costos
      const defaultCost = { gold: 100, wood: 0, stone: 0 };
      console.log(`RecruitmentMenu: No cost found for ${creature.type}, using default:`, defaultCost);
      costSource = defaultCost;
    }
    
    const total: Resources = { gold: 0, wood: 0, stone: 0 };
    
    // Multiplicar por la cantidad
    Object.entries(costSource).forEach(([resource, cost]) => {
      if (typeof cost === 'number') {
        total[resource as keyof Resources] = cost * quantity;
      }
    });
    
    return total;
  };

  // Determinar cuántas unidades están disponibles o pueden ser reclutadas
  const getMaxAvailable = (creature: AvailableCreature): number => {
    return creature.count || 0;
  };

  return (
    <div className="recruitment-menu">
      <div className="recruitment-header">
        <h3>Reclutar Unidades - {building.name}</h3>
        <button onClick={onClose} className="close-button">×</button>
      </div>

      <div className="recruitment-content">
        {(building.available_creatures || []).length > 0 ? (
          building.available_creatures.map((creature, index) => {
            const maxAvailable = getMaxAvailable(creature);
            const unitCost = getUnitCost(creature, 1);
            const totalCost = getUnitCost(creature, amount && selectedUnit === creature.type ? amount : 0);
            
            // Mostrar costos en consola para debugging
            console.log(`RecruitmentMenu: Creature ${creature.type} costs:`, unitCost);
            
            return (
              <div key={`${creature.type}-${index}`} className="unit-option">
                <div className="unit-info">
                  <h4>{creature.name || creature.type || 'Unidad'}</h4>
                  <p>Disponibles: {maxAvailable}</p>
                  <div className="unit-cost">
                    <p>Costo por unidad:</p>
                    <ul>
                      {Object.entries(unitCost).map(([resource, cost]) => 
                        cost > 0 ? (
                          <li key={resource}>{resource}: {cost}</li>
                        ) : null
                      )}
                    </ul>
                  </div>
                </div>
                <div className="unit-controls">
                  <div className="amount-control">
                    <label>Cantidad:</label>
                    <input
                      type="number"
                      min="0"
                      max={maxAvailable}
                      value={selectedUnit === creature.type ? amount : 0}
                      onChange={(e) => {
                        const value = Math.min(parseInt(e.target.value) || 0, maxAvailable);
                        setSelectedUnit(creature.type);
                        setAmount(value);
                      }}
                    />
                  </div>
                  
                  {selectedUnit === creature.type && amount > 0 && (
                    <div className="total-cost">
                      <p>Costo total:</p>
                      <ul>
                        {Object.entries(totalCost).map(([resource, cost]) => 
                          cost > 0 ? (
                            <li key={resource}>{resource}: {cost}</li>
                          ) : null
                        )}
                      </ul>
                    </div>
                  )}
                  
                  <Button
                    onClick={() => onRecruit(creature.type, amount)}
                    disabled={selectedUnit !== creature.type || amount <= 0 || maxAvailable <= 0}
                    className="recruit-button"
                  >
                    Reclutar
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-units-message">
            <p>No hay unidades disponibles para reclutar en este edificio.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecruitmentMenu;
