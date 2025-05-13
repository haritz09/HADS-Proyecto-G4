/*
* Página del menú principal
* Implementar:
* - Opciones de juego (nueva partida, cargar, etc.)
* - Selección de escenario para nueva partida
* - Lista de partidas guardadas
* - Configuración de juego
*/

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gameService, authService } from '../services/api';
import Button from '../components/ui/Button';
import '../styles/pages/MainMenuPage.css';

interface SavedGame {
  id: string;
  name: string;
  scenarioName: string;
  turn: number;
  lastSaved: string;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  mapSize: {
    width: number;
    height: number;
  };
}

const MainMenuPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Estados
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [showLoadGame, setShowLoadGame] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('');
  
  // Cargar datos del usuario y partidas guardadas
  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar datos del usuario
        const profileResponse = await authService.getProfile();
        setUserName(profileResponse.data.username);
        
        // Cargar partidas guardadas
        const savedGamesResponse = await gameService.getSavedGames();
        setSavedGames(savedGamesResponse.data);
        
        // Cargar escenarios disponibles
        const scenariosResponse = await gameService.getScenarios();
        setScenarios(scenariosResponse.data);
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };
    
    loadData();
  }, []);
  
  // Cargar partida guardada
  const handleLoadGame = (gameId: string) => {
    navigate(`/game/${gameId}`);
  };
  
  // Cerrar sesión
  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <div className="main-menu-page">
      <div className="menu-header">
        <h1>Heroes&Hostias</h1>
      </div>
      
      <div className="menu-content">
        <div className="menu-buttons">
          <Button 
            variant="primary" 
            size="large" 
            onClick={() => navigate('/scenarios')}
          >
            Nueva Partida
          </Button>
          
          <Button 
            variant="primary" 
            size="large" 
            onClick={() => {
              setShowLoadGame(true);
            }}
          >
            Cargar Partida
          </Button>
          
          <Button 
            variant="primary" 
            size="large"
          >
            Opciones
          </Button>
          
          <Button 
            variant="primary" 
            size="large"
          >
            Créditos
          </Button>
          
          <Button 
            variant="primary" 
            size="large" 
            onClick={handleLogout}
          >
            Cerrar Sesión
          </Button>
        </div>
        
        <div className="menu-main-content">
          {showLoadGame && (
            <div className="load-game-section">
              <h2>Cargar Partida</h2>
              
              {savedGames.length > 0 ? (
                <div className="saved-games-list">
                  {savedGames.map(game => (
                    <div 
                      key={game.id} 
                      className="saved-game-item"
                      onClick={() => handleLoadGame(game.id)}
                    >
                      <h3>{game.name}</h3>
                      <p>Escenario: {game.scenarioName}</p>
                      <p>Turno: {game.turn}</p>
                      <p>Última vez guardado: {new Date(game.lastSaved).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-saved-games">
                  No tienes partidas guardadas
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="menu-footer">
        <p>v.1.0.0 - Proyecto educativo</p>
      </div>
    </div>
  );
};

export default MainMenuPage;
