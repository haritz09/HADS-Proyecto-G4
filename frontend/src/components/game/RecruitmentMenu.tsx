import React, { useState } from 'react';
import { Building, Hero } from '../../types/game';
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

  return (
    <div className="recruitment-menu">
      <div className="recruitment-header">
        <h3>Reclutar Unidades - {building.name}</h3>
        <button onClick={onClose}>×</button>
      </div>

      <div className="recruitment-content">
        {building.available_creatures.map(creature => (
          <div key={creature.type} className="unit-option">
            <div className="unit-info">
              <span>{creature.type}</span>
              <span>Disponibles: {creature.count}</span>
            </div>
            <div className="unit-controls">
              <input
                type="number"
                min="0"
                max={creature.count}
                value={selectedUnit === creature.type ? amount : 0}
                onChange={(e) => {
                  setSelectedUnit(creature.type);
                  setAmount(Math.min(parseInt(e.target.value) || 0, creature.count));
                }}
              />
              <Button
                onClick={() => onRecruit(creature.type, amount)}
                disabled={selectedUnit !== creature.type || amount <= 0}
              >
                Reclutar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecruitmentMenu;
