/*
* Componente para mostrar información de un héroe
* Implementar:
* - Estadísticas del héroe
* - Inventario y artefactos equipados
* - Ejército/unidades
* - Experiencia y nivel
*/

import React from 'react';
import PropTypes from 'prop-types';
import { Hero, ArmyUnit } from '../../types/game';
import Button from '../ui/Button';
import '../../styles/components/HeroInfo.css';

interface HeroInfoProps {
  hero: Hero;
  onClose: () => void;
}

const HeroInfo: React.FC<HeroInfoProps> = ({ hero, onClose }) => {
  // Renderizar una unidad del ejército
  const renderUnit = (unit: ArmyUnit) => {
    return (
      <div key={`${unit.type}-${unit.count}`} className="hero-army-unit">
        <div className="unit-icon"></div>
        <div className="unit-info">
          <div className="unit-name">{unit.type}</div>
          <div className="unit-stats">
            <span className="unit-quantity">{unit.count}</span>
            <span className="unit-attack">A: {unit.stats.attack}</span>
            <span className="unit-defense">D: {unit.stats.defense}</span>
            <span className="unit-speed">S: {unit.stats.speed}</span>
            <span className="unit-movement">M: {unit.stats.movement_points}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="hero-info-panel">
      <div className="hero-info-header">
        <h2>{hero.name}</h2>
        <Button variant="secondary" size="small" onClick={onClose}>X</Button>
      </div>
      
      <div className="hero-stats">
        <div className="hero-stat">
          <div className="stat-icon attack-icon"></div>
          <div className="stat-value">{hero.stats.attack}</div>
          <div className="stat-name">Ataque</div>
        </div>
        
        <div className="hero-stat">
          <div className="stat-icon defense-icon"></div>
          <div className="stat-value">{hero.stats.defense}</div>
          <div className="stat-name">Defensa</div>
        </div>
        
        <div className="hero-stat">
          <div className="stat-icon speed-icon"></div>
          <div className="stat-value">{hero.stats.speed}</div>
          <div className="stat-name">Velocidad</div>
        </div>
      </div>
      
      <div className="hero-movement">
        <div className="movement-icon"></div>
        <div className="movement-value">
          {hero.stats.movement_points_left} / {hero.stats.movement_points}
        </div>
      </div>
      
      <h3>Ejército</h3>
      <div className="hero-army">
        {hero.army.length > 0 ? (
          hero.army.map(renderUnit)
        ) : (
          <div className="empty-army">No hay unidades en el ejército</div>
        )}
      </div>
      
      <h3>Artefactos</h3>
      <div className="hero-artifacts">
        {hero.artifacts.length > 0 ? (
          hero.artifacts.map(artifact => (
            <div key={artifact.id} className="hero-artifact">
              <div className={`artifact-icon ${artifact.subtype}`}></div>
              <div className="artifact-name">{artifact.name}</div>
            </div>
          ))
        ) : (
          <div className="empty-artifacts">No hay artefactos equipados</div>
        )}
      </div>
    </div>
  );
};

HeroInfo.propTypes = {
  hero: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    stats: PropTypes.shape({
      attack: PropTypes.number.isRequired,
      defense: PropTypes.number.isRequired,
      speed: PropTypes.number.isRequired,
      movement_points: PropTypes.number.isRequired,
      movement_points_left: PropTypes.number.isRequired,
    }).isRequired,
    army: PropTypes.arrayOf(PropTypes.shape({
      // Define army unit shape
    })).isRequired,
    artifacts: PropTypes.arrayOf(PropTypes.shape({
      // Define artifact shape
    })).isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default HeroInfo;
