import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gameService } from '../services/api';
import '../styles/pages/ScenarioMenuPage.css';

interface Scenario {
  _id: string;  // Añadimos _id para coincidir con MongoDB
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  mapSize: {
    width: number;
    height: number;
  };
}

const ScenarioMenuPage: React.FC = () => {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        console.log("Obteniendo escenarios...");
        const response = await gameService.getScenarios();
        console.log("Escenarios recibidos:", response.data);
        
        if (response.data && response.data.length > 0) {
          setScenarios(response.data);
          console.log("Escenario seleccionado por defecto:", response.data[0]._id);
        } else {
          setError('No hay escenarios disponibles');
        }
      } catch (err) {
        console.error("Error cargando escenarios:", err);
        setError('No se pudieron cargar los escenarios');
      } finally {
        setLoading(false);
      }
    };

    fetchScenarios();
  }, []);

  const handleStartGame = async () => {
    if (!scenarios || scenarios.length === 0) {
      console.log("No hay escenarios disponibles");
      return;
    }

    try {
      setLoading(true);
      // Usamos _id en lugar de id para coincidir con MongoDB
      const defaultScenario = scenarios[0]._id;
      console.log("Creando nueva partida con escenario:", defaultScenario);

      // Usar nuestro nuevo método que inicializa en el backend
      const response = await gameService.initializeGame(defaultScenario);
      console.log("Respuesta de initializeGame:", response);

      if (response.data && response.data._id) {
        console.log("Redirigiendo a /game con ID:", response.data._id);
        navigate(`/game/${response.data._id}`);
      }
    } catch (err) {
      console.error("Error creando partida:", err);
      setError('Error al crear la partida');
      setLoading(false);
    }
  };

  return (
    <div className="scenario-menu-page">
      <div className="scenario-menu-header">Selecciona un escenario</div>
      <div className="scenario-selection">
        <h3>Escenarios disponibles:</h3>
        {loading ? (
          <p style={{ color: '#fff' }}>Cargando...</p>
        ) : error ? (
          <p style={{ color: 'salmon' }}>{error}</p>
        ) : (
          <div className="scenarios-list">
            {scenarios.map(scenario => (
              <div
                key={scenario.id}
                className="scenario-item selected"
              >
                <h4>{scenario.name}</h4>
                <div className="scenario-meta">
                  <span className={`difficulty-badge ${scenario.difficulty}`}>
                    {scenario.difficulty === 'easy' ? 'Fácil' : 
                     scenario.difficulty === 'medium' ? 'Media' : 'Difícil'}
                  </span>
                  {scenario.mapSize && typeof scenario.mapSize.width === 'number' && typeof scenario.mapSize.height === 'number' ? (
                    <span className="map-size">Tamaño: {scenario.mapSize.width}x{scenario.mapSize.height}</span>
                  ) : (
                    <span className="map-size">Tamaño: N/D</span>
                  )}
                </div>
                <p>{scenario.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="scenario-menu-buttons">
        <button className="scenario-menu-btn" onClick={() => navigate(-1)}>
          Volver
        </button>
        <button 
          className="scenario-menu-btn"
          onClick={handleStartGame}
          disabled={loading}
        >
          {loading ? 'Creando partida...' : 'Comenzar'}
        </button>
      </div>
    </div>
  );
};

export default ScenarioMenuPage;
