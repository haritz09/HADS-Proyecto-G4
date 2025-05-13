import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/pages/MainMenuPage.css';

const MainMenuPage = () => {
  const navigate = useNavigate();

  const handleLoadGame = () => {
    // Implementation for loading a saved game
    console.log('Load game selected');
    // navigate('/load-game');
  };

  const handleNewGame = () => {
    // Implementation for starting a new game
    console.log('New game selected');
    // navigate('/new-game');
  };

  const handleExit = () => {
    // Implementation for exiting or logging out
    console.log('Exit selected');
    navigate('/login');
  };

  return (
    <div className="main-menu-page">
      <div className="main-menu-content">
        <div className="main-menu-title">
          <h1>Heroes&Hostias</h1>
        </div>
        
        <div className="main-menu-buttons">
          <button className="menu-button" onClick={handleLoadGame}>
            Load Game
          </button>
          <button className="menu-button" onClick={handleNewGame}>
            New Game
          </button>
          <button className="menu-button" onClick={handleExit}>
            Exit
          </button>
        </div>
      </div>
    </div>
  );
};

export default MainMenuPage;
