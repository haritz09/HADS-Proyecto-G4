// HeroesMenu.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HeroesMenu.css';

export default function HeroesMenu() {
  const [hoverButton, setHoverButton] = useState('');
  const navigate = useNavigate(); // Hook de navegación
  
  const getButtonStyle = (name: string) => {
    return hoverButton === name ? 'menu-button hovered' : 'menu-button';
  };
  
  // Función para navegar al mapa
  const handleLoadGame = () => {
    navigate('/heroesMap');
  };

  return (
    <div className="heroes-menu-container">
      {/* Decorative Top Banner */}
      <div className="top-banner">
        <div className="banner-content">
          <h1>LEGENDS OF THE REALM</h1>
        </div>
      </div>
      
      {/* Main Menu Content */}
      <div className="menu-content">
        {/* Left Decorative Panel */}
        <div className="decorative-panel">
          <div className="large-emblem">
            <div className="inner-emblem">
              <span className="emblem-icon">⚔️</span>
            </div>
          </div>
          <div className="small-emblem">
            <div className="inner-emblem">
              <span className="emblem-icon">🛡️</span>
            </div>
          </div>
        </div>
        
        {/* Center Menu Options */}
        <div className="menu-options">
          <div 
            className={getButtonStyle('new')}
            onMouseEnter={() => setHoverButton('new')}
            onMouseLeave={() => setHoverButton('')}
          >
            <span>NUEVA PARTIDA</span>
          </div>
          
          <div 
            className={getButtonStyle('load')}
            onMouseEnter={() => setHoverButton('load')}
            onMouseLeave={() => setHoverButton('')}
            onClick={handleLoadGame} // Añadimos el manejador de eventos aquí
          >
            <span>CARGAR PARTIDA</span>
          </div>
          
          <div 
            className={getButtonStyle('options')}
            onMouseEnter={() => setHoverButton('options')}
            onMouseLeave={() => setHoverButton('')}
          >
            <span>OPCIONES</span>
          </div>
          
          <div 
            className={getButtonStyle('credits')}
            onMouseEnter={() => setHoverButton('credits')}
            onMouseLeave={() => setHoverButton('')}
          >
            <span>CRÉDITOS</span>
          </div>
          
          <div 
            className={getButtonStyle('exit') + " exit-button"}
            onMouseEnter={() => setHoverButton('exit')}
            onMouseLeave={() => setHoverButton('')}
          >
            <span>SALIR</span>
          </div>
        </div>
        
        {/* Right Decorative Panel */}
        <div className="decorative-panel">
          <div className="small-emblem">
            <div className="inner-emblem">
              <span className="emblem-icon">🧙</span>
            </div>
          </div>
          <div className="large-emblem">
            <div className="inner-emblem">
              <span className="emblem-icon">🏰</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Audio Controls */}
      <div className="audio-controls">
        <div className="audio-control">
          <span className="audio-icon">🎵</span>
          <div className="volume-bar">
            <div className="volume-level" style={{width: '66%'}}></div>
          </div>
        </div>
        
        <div className="audio-control">
          <span className="audio-icon">🔊</span>
          <div className="volume-bar">
            <div className="volume-level" style={{width: '80%'}}></div>
          </div>
        </div>
        
        <span className="settings-icon">⚙️</span>
      </div>
      
      {/* Version Footer */}
      <div className="version-footer">
        v0.1.0 Alpha
      </div>
    </div>
  );
}