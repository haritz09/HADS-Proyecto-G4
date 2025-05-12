import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAudio } from '../../contexts/AudioContext';

const AudioPlayer: React.FC = () => {
  const location = useLocation();
  const { currentTrack, playLandingMusic, playGameMusic } = useAudio();
  
  // Cambiar la música según la ruta
  useEffect(() => {
    // Rutas que deberían tener música de la landing page
    const landingRoutes = ['/', '/login', '/register'];
    
    const changeMusic = async () => {
      // Comprobar si estamos en la landing page o una ruta relacionada
      if (landingRoutes.includes(location.pathname)) {
        if (currentTrack !== 'landing') {
          await playLandingMusic();
        }
      } else {
        // Para cualquier otra ruta, reproducir la música del juego
        if (currentTrack !== 'game') {
          await playGameMusic();
        }
      }
    };
    
    changeMusic();
  }, [location.pathname, currentTrack, playLandingMusic, playGameMusic]);
  
  // Este componente no renderiza nada visible
  return null;
};

export default AudioPlayer;
