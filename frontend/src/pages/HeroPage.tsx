/*
* Página de detalles del héroe
* Implementar:
* - Estadísticas detalladas del héroe
* - Inventario y gestión de artefactos
* - Distribución de unidades
* - Desarrollo de habilidades
*/

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { gameService } from '../services/api';
import { Hero, Artifact } from '../types/game';
import Button from '../components/ui/Button';
import '../styles/pages/HeroPage.css';

const HeroPage: React.FC = () => {
  const { heroId } = useParams<{ heroId: string }>();
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get('gameId');
  const navigate = useNavigate();
  
  // Estados
  const [hero, setHero] = useState<Hero | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableArtifacts, setAvailableArtifacts] = useState<Artifact[]>([]);
  
  // Cargar datos del héroe
  useEffect(() => {
    if (!heroId || !gameId) return;
    
    const loadHeroData = async () => {
      try {
        setLoading(true);
        
        // Obtener datos del juego actual
        const gameResponse = await gameService.loadGame(gameId);
        const gameData = gameResponse.data;
        
        // Obtener el héroe específico
        const heroData = gameData.heroes[heroId];
        if (!heroData) {
          throw new Error('Héroe no encontrado');
        }
        
        setHero(heroData);
        
        // Obtener artefactos disponibles (esto dependerá de tu API)
        // Por ahora usaremos un array vacío
        setAvailableArtifacts([]);
        
      } catch (err: any) {
        setError(err.message || 'Error al cargar los datos del héroe');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadHeroData();
  }, [heroId, gameId]);
  
  // Volver al mapa
  const handleBackToMap = () => {
    navigate(`/game/${gameId}`);
  };
  
  // Equipar un artefacto
  const handleEquipArtifact = (artifactId: string) => {
    // Implementar cuando la API esté disponible
    console.log('Equipar artefacto:', artifactId);
  };
  
  // Desequipar un artefacto
  const handleUnequipArtifact = (artifactId: string) => {
    // Implementar cuando la API esté disponible
    console.log('Desequipar artefacto:', artifactId);
  };

  if (loading) {
    return <div className="loading-screen">Cargando héroe...</div>;
  }
  
  if (error || !hero) {
    return (
      <div className="error-screen">
        {error || 'Error desconocido al cargar el héroe'}
        <Button onClick={handleBackToMap}>Volver al mapa</Button>
      </div>
    );
  }

  return (
    <div className="hero-page">
      <div className="hero-page-header">
        <Button variant="secondary" onClick={handleBackToMap}>
          Volver al mapa
        </Button>
        <h1>{hero.name}</h1>
      </div>
      
      <div className="hero-page-content">
        <div className="hero-details">
          <div className="hero-portrait">
            <img src={hero.portrait || '/assets/images/heroes/default.png'} alt={hero.name} />
          </div>
          
          <div className="hero-stats-panel">
            <h2>Estadísticas</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Nivel:</span>
                <span className="stat-value">{hero.level}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Experiencia:</span>
                <span className="stat-value">{hero.experience}/{hero.level * 1000}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Ataque:</span>
                <span className="stat-value">{hero.stats.attack}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Defensa:</span>
                <span className="stat-value">{hero.stats.defense}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Poder:</span>
                <span className="stat-value">{hero.stats.power}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Conocimiento:</span>
                <span className="stat-value">{hero.stats.knowledge}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Movimiento:</span>
                <span className="stat-value">{hero.movementPoints}/{hero.maxMovementPoints}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="hero-artifacts-panel">
          <h2>Artefactos</h2>
          <div className="artifacts-grid">
            {hero.artifacts.length > 0 ? (
              hero.artifacts.map(artifact => (
                <div key={artifact.id} className="artifact-item">
                  <div className={`artifact-icon ${artifact.slot}-slot`}></div>
                  <div className="artifact-info">
                    <h3>{artifact.name}</h3>
                    <p>{artifact.description}</p>
                    <div className="artifact-bonuses">
                      {Object.entries(artifact.bonuses).map(([stat, value]) => (
                        <span key={stat} className="artifact-bonus">
                          {stat}: +{value}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="small"
                    onClick={() => handleUnequipArtifact(artifact.id)}
                  >
                    Desequipar
                  </Button>
                </div>
              ))
            ) : (
              <div className="no-artifacts">
                No hay artefactos equipados
              </div>
            )}
          </div>
          
          {availableArtifacts.length > 0 && (
            <>
              <h3>Artefactos Disponibles</h3>
              <div className="available-artifacts">
                {availableArtifacts.map(artifact => (
                  <div key={artifact.id} className="artifact-item">
                    <div className={`artifact-icon ${artifact.slot}-slot`}></div>
                    <div className="artifact-info">
                      <h3>{artifact.name}</h3>
                      <p>{artifact.description}</p>
                      <div className="artifact-bonuses">
                        {Object.entries(artifact.bonuses).map(([stat, value]) => (
                          <span key={stat} className="artifact-bonus">
                            {stat}: +{value}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button 
                      variant="primary" 
                      size="small"
                      onClick={() => handleEquipArtifact(artifact.id)}
                    >
                      Equipar
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        
        <div className="hero-army-panel">
          <h2>Ejército</h2>
          <div className="army-units">
            {hero.army.length > 0 ? (
              hero.army.map(unit => (
                <div key={unit.id} className="army-unit">
                  <div className="unit-icon"></div>
                  <div className="unit-info">
                    <h3>{unit.name}</h3>
                    <div className="unit-stats">
                      <span className="unit-quantity">{unit.quantity}</span>
                      <span className="unit-attack">A: {unit.attack}</span>
                      <span className="unit-defense">D: {unit.defense}</span>
                      <span className="unit-health">HP: {unit.health}</span>
                      <span className="unit-speed">S: {unit.speed}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-units">
                El héroe no tiene unidades
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroPage;
