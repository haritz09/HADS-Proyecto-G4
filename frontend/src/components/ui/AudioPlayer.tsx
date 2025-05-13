import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAudio } from '../../contexts/AudioContext';

const AudioPlayer: React.FC = () => {
  const location = useLocation();
  const { currentTrack, playLandingMusic, playGameMusic, togglePlay, isPlaying } = useAudio();
  const [audioInitialized, setAudioInitialized] = useState(false);
  
  // Inicializar el tipo de audio correcto según la ruta, pero sin reproducirlo automáticamente
  useEffect(() => {
    // Rutas que deberían tener música de la landing page
    const landingRoutes = ['/', '/login', '/register'];
    
    const initializeAudio = async () => {
      if (!audioInitialized) {
        console.log("Inicializando el tipo de audio correcto sin reproducción...");
        
        // Comprobar si estamos en la landing page o una ruta relacionada
        if (landingRoutes.includes(location.pathname)) {
          if (currentTrack !== 'landing') {
            // Solo cargar la pista, sin reproducción automática
            // Esto configura currentTrack pero no reproduce el audio
            await playLandingMusic();
            // Pausar inmediatamente para evitar reproducción automática
            // pero mantener el currentTrack configurado
            togglePlay();
          }
        } else {
          // Para cualquier otra ruta, cargar la música del juego
          if (currentTrack !== 'game') {
            // Solo cargar la pista, sin reproducción automática
            await playGameMusic();
            // Pausar inmediatamente para evitar reproducción automática
            togglePlay();
          }
        }
        
        setAudioInitialized(true);
      }
    };
    
    initializeAudio();
  }, [location.pathname, currentTrack, playLandingMusic, playGameMusic, audioInitialized, togglePlay]);
  
  // Este componente no renderiza nada visible
  return null;
};

export default AudioPlayer;
