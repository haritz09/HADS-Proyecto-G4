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
  // Log hero artifacts when component renders
  console.log(`HeroInfo: Rendering hero ${hero.id} with artifacts:`, hero.artifacts);
  
  // Renderizar una unidad del ejército
  const renderUnit = (unit: ArmyUnit) => {
    return (
      <div key={`${unit.type}-${unit.count}`} className="hero-army-unit">
        <div className="unit-icon"></div>
        <div className="unit-info">
          <div className="unit-name">{unit.type}</div>
          <div className="unit-stats">
            <span className="unit-quantity">{unit.count}</span>
            <span className="unit-attack">A: {unit.stats?.attack ?? 0}</span>
            <span className="unit-defense">D: {unit.stats?.defense ?? 0}</span>
            <span className="unit-speed">S: {unit.stats?.speed ?? 0}</span>
            <span className="unit-movement">M: {unit.stats?.movement_points ?? 0}</span>
          </div>
        </div>
      </div>
    );
  };

  // Actualizar la sección de artefactos para mostrarlos correctamente
  const getArtifactIcon = (subtype: string): string => {
    switch (subtype) {
      case 'totemDeGuerra': return '⚔️';
      case 'totemVelocidad': return '⚡';
      case 'totemReclutamiento': return '💰';
      default: return '🏆';
    }
  };

  const getArtifactDescription = (subtype: string): string => {
    switch (subtype) {
      case 'totemDeGuerra': return 'Aumenta el ataque, defensa y salud de tus tropas en un 20%';
      case 'totemVelocidad': return 'Incrementa los puntos de movimiento en un 30%';
      case 'totemReclutamiento': return 'Reduce el costo de reclutamiento en un 30%';
      default: return 'Artefacto mágico';
    }
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
      
      {/* Debug artifacts outside of JSX hierarchy */}
      {(() => { 
        console.log("HeroInfo: Debugging hero artifacts:", hero.artifacts);
        return null; 
      })()}

      <h3>Artefactos</h3>
      <div className="hero-artifacts">
        {hero.artifacts && hero.artifacts.length > 0 ? (
          hero.artifacts.map(artifact => {
            console.log(`HeroInfo: Rendering artifact:`, artifact);
            console.log(`HeroInfo: Artifact properties - id: ${artifact.id}, name: ${artifact.name}, subtype: ${artifact.subtype}`);
            return (
              <div key={artifact.id} className="hero-artifact">
                <div className={`artifact-icon artifact-${artifact.subtype}`}>
                  {getArtifactIcon(artifact.subtype)}
                </div>
                <div className="artifact-details">
                  <div className="artifact-name">{artifact.name}</div>
                  <div className="artifact-effect">{getArtifactDescription(artifact.subtype)}</div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-artifacts">
            No hay artefactos equipados
          </div>
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
