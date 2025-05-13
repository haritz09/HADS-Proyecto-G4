import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAudio } from '../../contexts/AudioContext';

const AudioPlayer: React.FC = () => {
  const location = useLocation();
  const { 
    currentTrack, 
    playLandingMusic, 
    playGameMusic, 
    playLoginMusic, 
    togglePlay, 
    isPlaying 
  } = useAudio();
  const [audioInitialized, setAudioInitialized] = useState(false);
  
  // Cambiar la música según la ruta
  useEffect(() => {
    // Rutas que deberían tener música de la landing page
    const landingRoutes = ['/'];
    
    // Rutas para la música de login/catacumbas
    const loginRoutes = ['/login', '/register'];
    
    const initializeAudio = async () => {
      console.log("Ruta actual:", location.pathname);
      
      if (landingRoutes.includes(location.pathname)) {
        console.log("Usando música de landing");
        if (currentTrack !== 'landing') {
          await playLandingMusic();
        }
      } else if (loginRoutes.includes(location.pathname)) {
        console.log("Usando música de catacumbas para login/register");
        if (currentTrack !== 'login') {
          await playLoginMusic();
        }
      } else {
        // Para cualquier otra ruta (páginas del juego), reproducir la música del juego
        console.log("Usando música de juego");
        if (currentTrack !== 'game') {
          await playGameMusic();
        }
      }
      
      setAudioInitialized(true);
    };
    
    initializeAudio();
  }, [location.pathname, currentTrack, playLandingMusic, playGameMusic, playLoginMusic]);
  
  // Este componente no renderiza nada visible
  return null;
};

export default AudioPlayer;
