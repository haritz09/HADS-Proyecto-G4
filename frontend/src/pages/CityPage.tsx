/*
* Página de gestión de ciudad
* Implementar:
* - Vista detallada de una ciudad
* - Construcción de edificios
* - Reclutamiento de unidades
* - Gestión de recursos
*/

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { gameService } from '../services/api';
import { City, Resources, Hero } from '../types/game';
import CityView from '../components/game/CityView';
import Button from '../components/ui/Button';
import '../styles/pages/CityPage.css';

const CityPage: React.FC = () => {
  const { cityId } = useParams<{ cityId: string }>();
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get('gameId');
  const navigate = useNavigate();
  
  // Estados
  const [city, setCity] = useState<City | null>(null);
  const [playerResources, setPlayerResources] = useState<Resources>({
    gold: 0, wood: 0, stone: 0
  });
  const [availableHeroes, setAvailableHeroes] = useState<Hero[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Cargar datos de la ciudad
  useEffect(() => {
    if (!cityId || !gameId) return;
    
    const loadCityData = async () => {
      try {
        setLoading(true);
        
        // Obtener datos del juego actual
        const gameResponse = await gameService.loadGame(gameId);
        const gameData = gameResponse.data;
        
        // Obtener la ciudad específica
        const cityData = gameData.cities[cityId];
        if (!cityData) {
          throw new Error('Ciudad no encontrada');
        }
        
        setCity(cityData);
        
        // // Obtener recursos del jugador actual
        // const currentPlayer = gameData.players.find((p: Player) => p.id === gameData.currentPlayer);
        // if (currentPlayer) {
        //   setPlayerResources(currentPlayer.resources);
        // }
        
        // Obtener héroes del jugador que podrían recibir unidades
        const playerHeroes = (Object.values(gameData.heroes) as Hero[]).filter((h) =>
          h.id.startsWith(gameData.currentPlayer)
        );
        setAvailableHeroes(playerHeroes);
        
      } catch (err: any) {
        setError(err.message || 'Error al cargar los datos de la ciudad');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadCityData();
  }, [cityId, gameId]);
  
  // Construir un edificio
  const handleBuildBuilding = async (buildingId: string) => {
    if (!cityId || !gameId) return;
    
    try {
      const response = await gameService.buildBuilding(gameId, cityId, buildingId);
      
      // Actualizar estado local
      setCity(response.data.city);
      setPlayerResources(response.data.playerResources);
    } catch (err: any) {
      console.error('Error al construir edificio:', err);
      // Mostrar mensaje de error
    }
  };
  
  // Reclutar unidades
  const handleRecruitUnits = async (unitId: string, amount: number, heroId?: string) => {
    if (!cityId || !gameId) return;
    
    try {
      const response = await gameService.recruitUnits(gameId, cityId, unitId, amount, heroId);
      
      // Actualizar estado local
      setCity(response.data.city);
      setPlayerResources(response.data.playerResources);
      
      // Si se reclutaron unidades para un héroe, actualizar la lista de héroes
      if (heroId) {
        setAvailableHeroes(prev => 
          prev.map(hero => 
            hero.id === heroId ? response.data.updatedHero : hero
          )
        );
      }
    } catch (err: any) {
      console.error('Error al reclutar unidades:', err);
      // Mostrar mensaje de error
    }
  };
  
  // Volver al mapa
  const handleBackToMap = () => {
    navigate(`/game/${gameId}`);
  };

  if (loading) {
    return <div className="loading-screen">Cargando ciudad...</div>;
  }
  
  if (error || !city) {
    return (
      <div className="error-screen">
        {error || 'Error desconocido al cargar la ciudad'}
        <Button onClick={handleBackToMap}>Volver al mapa</Button>
      </div>
    );
  }

  return (
    <div className="city-page">
      <div className="city-page-header">
        <Button variant="secondary" onClick={handleBackToMap}>
          Volver al mapa
        </Button>
        <h1>{city.name}</h1>
      </div>
      
      <div className="city-page-content">
        <CityView
          city={city}
          playerResources={playerResources}
          heroes={availableHeroes}
          onBuildBuilding={handleBuildBuilding}
          onRecruitUnits={handleRecruitUnits}
          onClose={handleBackToMap}
        />
      </div>
    </div>
  );
};

export default CityPage;
