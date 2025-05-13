import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gameService, authService } from '../services/api';
import '../styles/pages/LoadGamePage.css';

interface SavedGame {
  id: string;
  name: string;
  last_saved: string;
  game_state: {
    turn: number;
    scenario: string;
  };
}

const LoadGamePage: React.FC = () => {
  const navigate = useNavigate();
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSavedGames = async () => {
      try {
        setLoading(true);
        // Obtener el usuario actual
        const profileResponse = await authService.getProfile();
        const userId = profileResponse.data.id;
        
        // Obtener las partidas guardadas
        // La función no acepta parámetros directamente, así que usamos el endpoint adecuado
        const response = await gameService.getSavedGames();
        setSavedGames(response.data);
        if (response.data.length > 0) {
          setSelectedGameId(response.data[0].id);
        }
      } catch (err) {
        setError('No se pudieron cargar las partidas guardadas');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSavedGames();
  }, []);

  const handleLoadGame = async () => {
    if (!selectedGameId) return;
    try {
      navigate(`/game/${selectedGameId}`);
    } catch (err) {
      setError('No se pudo cargar la partida');
    }
  };

  // Formatear fecha para mostrarla de manera legible
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="load-game-page scenario-menu-page">
      <div className="scenario-menu-header">Cargar Partida Guardada</div>
      
      <div className="scenario-selection">
        <h3>Partidas guardadas:</h3>
        {loading ? (
          <p style={{ color: '#fff' }}>Cargando...</p>
        ) : error ? (
          <p style={{ color: 'salmon' }}>{error}</p>
        ) : savedGames.length === 0 ? (
          <p style={{ color: '#fff' }}>No hay partidas guardadas</p>
        ) : (
          <div className="saved-games-list">
            <select 
              className="saved-game-select"
              value={selectedGameId || ''}
              onChange={(e) => setSelectedGameId(e.target.value)}
            >
              {savedGames.map(game => (
                <option key={game.id} value={game.id}>
                  {game.name} - Turno: {game.game_state.turn} - Guardado: {formatDate(game.last_saved)}
                </option>
              ))}
            </select>
            
            {selectedGameId && (
              <div className="selected-game-details">
                {(() => {
                  const selectedGame = savedGames.find(game => game.id === selectedGameId);
                  if (!selectedGame) return null;
                  
                  return (
                    <>
                      <h4>{selectedGame.name}</h4>
                      <p>Escenario: {selectedGame.game_state.scenario}</p>
                      <p>Turno: {selectedGame.game_state.turn}</p>
                      <p>Última vez guardado: {formatDate(selectedGame.last_saved)}</p>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="scenario-menu-buttons">
        <button
          className="scenario-menu-btn"
          onClick={() => navigate('/menu')}
        >
          Volver
        </button>
        <button
          className="scenario-menu-btn"
          onClick={handleLoadGame}
          disabled={!selectedGameId || loading}
        >
          Cargar Partida
        </button>
      </div>
    </div>
  );
};

export default LoadGamePage;
