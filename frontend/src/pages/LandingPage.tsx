import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAudio } from '../contexts/AudioContext';
import '../styles/pages/LandingPage.css';

const LandingPage: React.FC = () => {
  const { isPlaying, playLandingMusic } = useAudio();
  const [showMusicButton, setShowMusicButton] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const handlePlayMusic = async () => {
    try {
      console.log("Intentando reproducir música desde el botón...");
      
      // Primero intentamos con el AudioContext
      const success = await playLandingMusic();
      
      // Si falla, intentamos reproducir directamente desde el elemento HTML
      if (!success && audioRef.current) {
        console.log("Intentando reproducir desde el elemento HTML de audio");
        try {
          await audioRef.current.play();
          console.log("Reproducción exitosa desde elemento HTML");
          setShowMusicButton(false);
          setErrorMessage(null);
          return;
        } catch (htmlErr) {
          console.error("Error reproduciendo desde elemento HTML:", htmlErr);
          setErrorMessage("No se pudo reproducir la música. Verifica los archivos de audio.");
        }
      } else if (success) {
        console.log("Reproducción exitosa desde AudioContext");
        setShowMusicButton(false);
        setErrorMessage(null);
      } else {
        console.log("Reproducción fallida");
        setErrorMessage("No se pudo reproducir la música. Por favor, verifica que los archivos de audio existan y sean compatibles.");
      }
    } catch (error) {
      console.error("Error al reproducir música:", error);
      setErrorMessage("Error al reproducir música: " + (error instanceof Error ? error.message : "Error desconocido"));
    }
  };

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
      {showMusicButton && (
        <button 
          className="music-start-button"
          onClick={handlePlayMusic}
        >
          ▶ Activar Música
        </button>
      )}
      
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
