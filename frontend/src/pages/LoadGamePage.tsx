import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gameService } from '../services/api';
import '../styles/pages/LoadGamePage.css';

// Actualizada para coincidir con la estructura real de la API y añadir campos opcionales
interface SavedGame {
  _id: string;
  name: string;
  user_id: string;
  scenario_id: string;
  created_at: string;
  last_saved: string;
  is_autosave: boolean;
  cheats_used: string[];
  game_state?: {
    turn?: number;
    current_player?: string;
  }
}

const LoadGamePage: React.FC = () => {
  const navigate = useNavigate();
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSavedGames = async () => {
      try {
        setLoading(true);
        console.log("Solicitando partidas guardadas...");
        
        const response = await gameService.getSavedGames();
        console.log("Respuesta recibida:", response);
        
        if (response && response.data) {
          // Asegúrate de que los datos tengan el formato esperado
          const games = Array.isArray(response.data) ? response.data : [response.data];
          setSavedGames(games);
          if (games.length > 0) {
            setSelectedGame(games[0]._id);
          }
        } else {
          throw new Error("Formato de respuesta inesperado");
        }
      } catch (err) {
        console.error("Error al cargar partidas:", err);
        setError('No se pudieron cargar las partidas guardadas');
      } finally {
        setLoading(false);
      }
    };
    fetchSavedGames();
  }, []);

  const handleLoadGame = async () => {
    if (!selectedGame) return;
    try {
      // Agregamos un manejo más robusto para la carga
      setLoading(true);
      console.log(`Intentando cargar partida con ID: ${selectedGame}`);
      navigate(`/game/${selectedGame}`);
    } catch (err) {
      console.error("Error al cargar la partida:", err);
      setError('No se pudo cargar la partida');
    } finally {
      setLoading(false);
    }
  };

  // Formatear fecha para mostrarla de manera legible
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      console.error("Error al formatear fecha:", e);
      return "Fecha desconocida";
    }
  };

  return (
    <div className="scenario-menu-page">
      <div className="scenario-menu-header">Cargar Partida</div>
      <div className="scenario-selection">
        <h3>Partidas guardadas:</h3>
        {loading ? (
          <p style={{ color: '#fff' }}>Cargando...</p>
        ) : error ? (
          <p style={{ color: 'salmon' }}>{error}</p>
        ) : savedGames.length === 0 ? (
          <p style={{ color: '#fff' }}>No hay partidas guardadas</p>
        ) : (
          <>
            <select 
              className="scenario-select"
              value={selectedGame || ''}
              onChange={(e) => setSelectedGame(e.target.value)}
            >
              <option value="" disabled>Selecciona una partida</option>
              {savedGames.map(game => (
                <option key={game._id} value={game._id}>
                  {game.name} - Guardado: {formatDate(game.last_saved)}
                </option>
              ))}
            </select>
            
            {selectedGame && (
              <div className="game-details">
                {(() => {
                  const game = savedGames.find(g => g._id === selectedGame);
                  if (!game) return null;
                  
                  return (
                    <>
                      <h4>{game.name}</h4>
                      <div className="game-meta">
                        <span className="turn-badge">Turno: {game.game_state?.turn || 1}</span>
                        <span className="scenario-badge">Partida {game.is_autosave ? 'AutoGuardada' : 'Manual'}</span>
                      </div>
                      <p>Creado: {formatDate(game.created_at)}</p>
                      <p>Guardado: {formatDate(game.last_saved)}</p>
                    </>
                  );
                })()}
              </div>
            )}
          </>
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
          disabled={!selectedGame || loading}
        >
          Cargar Partida
        </button>
      </div>
    </div>
  );
};

export default LoadGamePage;
