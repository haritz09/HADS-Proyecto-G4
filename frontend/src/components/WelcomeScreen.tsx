import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const WelcomeScreen: React.FC = () => {
  const [playerName, setPlayerName] = useState('');
  const navigate = useNavigate();

  const handleStartGame = () => {
    // For now, we'll just navigate to a game route
    // Later you can integrate with your GameContext
    navigate('/game');
  };

  return (
    <div className="welcome-screen">
      <h1>Bienvenido a la Aventura</h1>
      <div className="welcome-form">
        <input
          type="text"
          placeholder="Tu nombre"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
        <button 
          onClick={handleStartGame}
          disabled={!playerName.trim()}
        >
          Comenzar juego
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;
