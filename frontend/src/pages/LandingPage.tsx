import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAudio } from '../contexts/AudioContext';
import '../styles/pages/LandingPage.css';

const LandingPage: React.FC = () => {
  const { isPlaying, playLandingMusic } = useAudio();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Intentar verificar si los archivos de audio existen
  useEffect(() => {
    const checkAudioFiles = async () => {
      try {
        const landingResponse = await fetch('/assets/audio/landing-theme.mp3');
        if (!landingResponse.ok) {
          setErrorMessage(`No se encontró el archivo de audio. Estado: ${landingResponse.status}`);
        }
      } catch (error) {
        setErrorMessage("Error al verificar archivos de audio: " + (error instanceof Error ? error.message : "Error desconocido"));
      }
    };
    
    checkAudioFiles();
  }, []);

  return (
    <div className="landing-page">
      {errorMessage && (
        <div className="error-message">
          {errorMessage}
        </div>
      )}
      
      <div className="landing-content">
        <div className="title-container">
          <h1 className="game-title">Heroes&Hostias</h1>
        </div>
        
        <div className="buttons-container">
          <Link to="/login" className="landing-button login-button">
            <span className="button-text">Iniciar Sesión</span>
          </Link>
          
          <Link to="/register" className="landing-button register-button">
            <span className="button-text">Registrarse</span>
          </Link>
        </div>
      </div>
      
      <div className="version-footer">
        <span>v1.0.0 Beta</span>
      </div>
      
      {/* Elemento de audio para reproducción directa como fallback */}
      <audio 
        ref={audioRef}
        src="/assets/audio/landing-theme.mp3" 
        loop
        preload="auto"
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default LandingPage;
