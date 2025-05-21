import React, { useState, useEffect } from 'react';
import { gameService } from '../../services/api';
import { useParams } from 'react-router-dom';
import { useGame } from '../../contexts/GameContext';
import '../../styles/components/CheatMenu.css';

interface CheatMenuProps {
  onClose: () => void;
  gameState: any;
}

interface Cheat {
  code: string;
  name: string;
  description: string;
  requiresTarget: boolean;
  targetType: 'hero' | 'city' | 'none';
}

// Interfaces para tipar heroes y ciudades
interface Hero {
  id: string;
  name: string;
  [key: string]: any; // Para otras propiedades que pueda tener el héroe
}

interface City {
  id: string;
  name: string;
  [key: string]: any; // Para otras propiedades que pueda tener la ciudad
}

// Interfaz para el tipo de error
interface ApiError {
  response?: {
    data?: {
      detail?: string;
    };
  };
  message?: string;
}

const CheatMenu: React.FC<CheatMenuProps> = ({ onClose, gameState }) => {
  const { gameId } = useParams<{ gameId: string }>();
  const { loadGame } = useGame(); // Usar el contexto de juego para recargar el estado
  const [selectedCheat, setSelectedCheat] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  // Lista de cheats disponibles
  const cheats: Cheat[] = [
    {
      code: 'construir_todos_edificios',
      name: 'Construir Todos los Edificios',
      description: 'Construye todos los edificios en la ciudad seleccionada',
      requiresTarget: true,
      targetType: 'city'
    },
    {
      code: 'victoria_inmediata',
      name: 'Victoria Inmediata',
      description: 'Gana la partida instantáneamente',
      requiresTarget: false,
      targetType: 'none'
    },
    {
      code: 'derrota_inmediata',
      name: 'Derrota Inmediata',
      description: 'Pierde la partida instantáneamente',
      requiresTarget: false,
      targetType: 'none'
    },
    {
      code: 'movimiento_infinito',
      name: 'Movimiento Infinito',
      description: 'Da movimiento ilimitado al héroe seleccionado',
      requiresTarget: true,
      targetType: 'hero'
    },
    {
      code: 'revelar_tesoros',
      name: 'Revelar Tesoros',
      description: 'Revela todos los tesoros del mapa',
      requiresTarget: false,
      targetType: 'none'
    },
    {
      code: 'revelar_mapa',
      name: 'Revelar Mapa',
      description: 'Revela todo el mapa',
      requiresTarget: false,
      targetType: 'none'
    }
  ];

  // Obtener héroes y ciudades del estado del juego con tipado
  const heroes: Hero[] = gameState?.player?.heroes || [];
  const cities: City[] = gameState?.player?.cities || [];

  // Restablecer el objetivo cuando cambia el cheat seleccionado
  useEffect(() => {
    setSelectedTarget(null);
  }, [selectedCheat]);

  const handleApplyCheat = async () => {
    if (!gameId || !selectedCheat) return;

    const currentCheat = cheats.find(cheat => cheat.code === selectedCheat);
    if (!currentCheat) return;

    // Verificar si el cheat requiere un objetivo y si se ha seleccionado uno
    if (currentCheat.requiresTarget && !selectedTarget) {
      setMessage(`Debe seleccionar un objetivo para el cheat ${currentCheat.name}`);
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Construir el objeto de cheat según el formato esperado por el backend
      const cheatPayload = {
        cheat_code: selectedCheat,
        target: currentCheat.requiresTarget ? { id: selectedTarget } : {}
      };

      // Enviar solicitud al backend
      const response = await gameService.applyCheat(gameId, cheatPayload);
      
      if (response.success) {
        setSuccess(true);
        setMessage(`Cheat aplicado: ${response.data.message || 'Éxito'}`);
        
        // Para el cheat de derrota inmediata, actualizar inmediatamente el estado para mostrar GameOver
        if (selectedCheat === 'derrota_inmediata') {
          // Esperar un momento breve para mostrar el mensaje de éxito
          setTimeout(async () => {
            await loadGame(gameId);
            // No cerramos el menú en este caso, pues la pantalla GameOver se mostrará automáticamente
            // al actualizar el estado del juego a 'defeat'
          }, 1000);
        } else {
          // Para otros cheats, comportamiento normal
          setTimeout(async () => {
            await loadGame(gameId);
            onClose();
          }, 1500);
        }
      } else {
        setMessage(`Error al aplicar cheat: ${response.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error aplicando cheat:', error);
      // Convertir el error desconocido al tipo ApiError
      const apiError = error as ApiError;
      setMessage(`Error al aplicar cheat: ${apiError.response?.data?.detail || apiError.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cheat-menu-overlay">
      <div className="cheat-menu">
        <div className="cheat-menu-header">
          <h2>Menú de Cheats</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="cheat-menu-content">
          <div className="cheat-list">
            <h3>Cheats disponibles:</h3>
            <div className="cheat-grid">
              {cheats.map(cheat => (
                <div 
                  key={cheat.code}
                  className={`cheat-item ${selectedCheat === cheat.code ? 'selected' : ''}`}
                  onClick={() => setSelectedCheat(cheat.code)}
                >
                  <h4>{cheat.name}</h4>
                  <p>{cheat.description}</p>
                </div>
              ))}
            </div>
          </div>
          
          {selectedCheat && (() => {
            const cheat = cheats.find(c => c.code === selectedCheat);
            if (cheat?.requiresTarget) {
              return (
                <div className="target-selection">
                  <h3>Seleccionar objetivo:</h3>
                  {cheat.targetType === 'hero' ? (
                    <div className="target-list">
                      {heroes.map((hero: Hero) => (
                        <div 
                          key={hero.id}
                          className={`target-item ${selectedTarget === hero.id ? 'selected' : ''}`}
                          onClick={() => setSelectedTarget(hero.id)}
                        >
                          {hero.name} (ID: {hero.id})
                        </div>
                      ))}
                    </div>
                  ) : cheat.targetType === 'city' ? (
                    <div className="target-list">
                      {cities.map((city: City) => (
                        <div 
                          key={city.id}
                          className={`target-item ${selectedTarget === city.id ? 'selected' : ''}`}
                          onClick={() => setSelectedTarget(city.id)}
                        >
                          {city.name} (ID: {city.id})
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            }
            return null;
          })()}
          
          <div className="cheat-actions">
            <button 
              className="apply-cheat-button" 
              onClick={handleApplyCheat}
              disabled={!selectedCheat || (cheats.find(c => c.code === selectedCheat)?.requiresTarget && !selectedTarget) || loading}
            >
              {loading ? 'Aplicando...' : 'Aplicar Cheat'}
            </button>
          </div>
          
          {message && (
            <div className={`cheat-message ${success ? 'success' : 'error'}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheatMenu;
