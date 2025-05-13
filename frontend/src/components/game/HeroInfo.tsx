/*
* Componente para mostrar información de un héroe
* Implementar:
* - Estadísticas del héroe
* - Inventario y artefactos equipados
* - Ejército/unidades
* - Experiencia y nivel
*/

import { Hero, Unit } from '../../types/game';
import Button from '../ui/Button';
import '../../styles/components/HeroInfo.css';

interface HeroInfoProps {
  hero: Hero;
  onClose: () => void;
}

const HeroInfo: React.FC<HeroInfoProps> = ({ hero, onClose }) => {
  // Renderizar una unidad del ejército
  const renderUnit = (unit: Unit) => {
    return (
      <div key={unit.id} className="hero-army-unit">
        <div className="unit-icon"></div>
        <div className="unit-info">
          <div className="unit-name">{unit.name}</div>
          <div className="unit-stats">
            <span className="unit-quantity">{unit.quantity}</span>
            <span className="unit-attack">A: {unit.attack}</span>
            <span className="unit-defense">D: {unit.defense}</span>
            <span className="unit-health">HP: {unit.health}</span>
            <span className="unit-speed">S: {unit.speed}</span>
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
      
      <div className="hero-portrait">
        <img src={hero.portrait || '/assets/images/heroes/default.png'} alt={hero.name} />
      </div>
      
      <div className="hero-level-info">
        <div className="hero-level">Nivel {hero.level}</div>
        <div className="hero-xp-bar">
          <div 
            className="hero-xp-progress" 
            style={{ width: `${(hero.experience / (hero.level * 1000)) * 100}%` }}
          ></div>
        </div>
        <div className="hero-xp-text">{hero.experience} / {hero.level * 1000} XP</div>
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
          <div className="stat-icon power-icon"></div>
          <div className="stat-value">{hero.stats.power}</div>
          <div className="stat-name">Poder</div>
        </div>
        
        <div className="hero-stat">
          <div className="stat-icon knowledge-icon"></div>
          <div className="stat-value">{hero.stats.knowledge}</div>
          <div className="stat-name">Conocim.</div>
        </div>
      </div>
      
      <div className="hero-movement">
        <div className="movement-icon"></div>
        <div className="movement-value">
          {hero.movementPoints} / {hero.maxMovementPoints}
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
              <div className={`artifact-icon ${artifact.slot}-slot`}></div>
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

export default HeroInfo;
