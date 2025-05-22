import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button'; // Fix: import as default instead of named export
import '../../styles/components/GameOverScreen.css';
import { GameState } from '../../types/game';

interface GameOverScreenProps {
  status: 'victory' | 'defeat' | 'draw';
  gameState: GameState;
  onRestart?: () => void;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ status, gameState, onRestart }) => {
  const navigate = useNavigate();
  
  // Determinar título y mensaje según el estado del juego
  const getTitle = () => {
    switch(status) {
      case 'victory': return '¡Victoria!';
      case 'defeat': return 'Derrota';
      case 'draw': return 'Empate';
      default: return 'Fin de la partida';
    }
  };
  
  const getMessage = () => {
    switch(status) {
      case 'victory': 
        return 'Has derrotado a tu enemigo y conquistado el reino. ¡Felicidades!';
      case 'defeat': 
        return 'Tus fuerzas han sido completamente derrotadas. Mejor suerte la próxima vez.';
      case 'draw': 
        return `Después de ${gameState.turn} turnos, ningún bando ha logrado imponerse. La guerra continúa en tablas.`;
      default: 
        return 'La partida ha terminado.';
    }
  };
  
  // Estadísticas básicas de la partida
  const getStatistics = () => {
    return (
      <div className="game-stats">
        <h3>Estadísticas finales</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-label">Turnos jugados</div>
            <div className="stat-value">{gameState.turn}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Ciudades conquistadas</div>
            <div className="stat-value">{gameState.player.cities.length}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Héroes activos</div>
            <div className="stat-value">{gameState.player.heroes.length}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Recursos acumulados</div>
            <div className="stat-value">
              Oro: {gameState.player.resources.gold} | 
              Madera: {gameState.player.resources.wood} | 
              Piedra: {gameState.player.resources.stone}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Navegar al menú principal
  const handleMainMenu = () => {
    navigate('/menu'); // Changed from '/' to '/menu' to go to MainMenuPage
  };
  
  return (
    <div className="game-over-screen">
      <div className="game-over-content">
        <h1 className={`game-over-title ${status}`}>{getTitle()}</h1>
        <p className="game-over-message">{getMessage()}</p>
        
        {getStatistics()}
        
        <div className="game-over-actions">
          {onRestart && (
            <Button variant="primary" onClick={onRestart}>
              Reiniciar Partida
            </Button>
          )}
          <Button variant="secondary" onClick={handleMainMenu}>
            Volver al Menú Principal
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GameOverScreen;
