import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gameService } from '../services/api';
import '../styles/pages/ScenarioMenuPage.css';

interface Scenario {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard'; // Asegurarse de que esta propiedad esté definida
  mapSize: {
    width: number;
    height: number;
  };
}

const ScenarioMenuPage: React.FC = () => {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const response = await gameService.getScenarios();
        setScenarios(response.data);
        if (response.data.length > 0) {
          setSelectedScenario(response.data[0].id);
        }
      } catch (err) {
        setError('No se pudieron cargar los escenarios');
      } finally {
        setLoading(false);
      }
    };
    fetchScenarios();
  }, []);

  const handleStartGame = async () => {
    if (!selectedScenario) return;
    try {
      const response = await gameService.createGame(selectedScenario);
      navigate(`/game/${response.data.id}`);
    } catch (err) {
      setError('No se pudo crear la partida');
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
                className={`scenario-item ${selectedScenario === scenario.id ? 'selected' : ''}`}
                onClick={() => setSelectedScenario(scenario.id)}
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
        <button
          className="scenario-menu-btn"
          onClick={() => navigate(-1)}
        >
          Volver
        </button>
        <button
          className="scenario-menu-btn"
          onClick={handleStartGame}
          disabled={!selectedScenario}
        >
          Comenzar
        </button>
      </div>
    </div>
  );
};

export default ScenarioMenuPage;
