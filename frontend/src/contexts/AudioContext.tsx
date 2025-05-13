import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

// Añadir un nuevo tipo para el nuevo audio
type AudioTrack = 'landing' | 'game' | 'login' | 'none';

interface AudioContextType {
  currentTrack: AudioTrack;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  playLandingMusic: () => Promise<boolean>;
  playGameMusic: () => Promise<boolean>;
  playLoginMusic: () => Promise<boolean>; // Nueva función para reproducir música de login
  stopMusic: () => void;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
}

const AudioContext = createContext<AudioContextType>({
  currentTrack: 'none',
  isPlaying: false,
  volume: 0.5,
  isMuted: false,
  playLandingMusic: async () => false,
  playGameMusic: async () => false,
  playLoginMusic: async () => false, // Nueva función para reproducir música de login
  stopMusic: () => {},
  togglePlay: () => {},
  setVolume: () => {},
  toggleMute: () => {},
});

export const useAudio = () => useContext(AudioContext);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<AudioTrack>('none');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  
  const landingAudioRef = useRef<HTMLAudioElement | null>(null);
  const gameAudioRef = useRef<HTMLAudioElement | null>(null);
  const loginAudioRef = useRef<HTMLAudioElement | null>(null); // Nueva referencia para el audio de login
  const hasInteractedRef = useRef(false);
  
  // Inicializar elementos de audio
  useEffect(() => {
    console.log("Inicializando audio...");
    
    try {
      // Verificamos explícitamente si hay soporte de audio
      if (typeof Audio !== 'undefined') {
        // Corregimos las rutas - USAR RUTAS ABSOLUTAS, no relativas
        landingAudioRef.current = new Audio('/assets/audio/landing-theme.mp3');
        gameAudioRef.current = new Audio('/assets/audio/game-theme.mp3');
        loginAudioRef.current = new Audio('/assets/audio/catacombs.mp3'); // Nuevo audio para login
        
        // Log para depuración
        console.log("Archivos de audio creados:");
        console.log("Landing:", landingAudioRef.current);
        console.log("Game:", gameAudioRef.current);
        console.log("Login:", loginAudioRef.current);
        
        // Verificar si los archivos existen
        const checkAudioExistence = async () => {
          try {
            // Comprobamos si los archivos existen haciendo una petición fetch
            const landingResponse = await fetch('/assets/audio/landing-theme.mp3');
            const gameResponse = await fetch('/assets/audio/game-theme.mp3');
            const loginResponse = await fetch('/assets/audio/catacombs.mp3'); // Verificar el nuevo audio
            
            console.log("Estado de la petición del audio landing:", landingResponse.status);
            console.log("Estado de la petición del audio game:", gameResponse.status);
            console.log("Estado de la petición del audio login:", loginResponse.status);
            
            if (!landingResponse.ok || !gameResponse.ok || !loginResponse.ok) {
              console.error("No se pudieron cargar los archivos de audio. Verifique las rutas.");
              setAudioLoaded(false);
              return;
            }
            
            // Si llegamos aquí, todos los archivos existen
            setAudioLoaded(true);
          } catch (error) {
            console.error("Error verificando archivos de audio:", error);
            setAudioLoaded(false);
          }
        };
        
        checkAudioExistence();
        
        // Agregar eventos para saber cuando se han cargado
        if (landingAudioRef.current) {
          landingAudioRef.current.addEventListener('canplaythrough', () => {
            console.log("Audio de landing cargado completamente");
          });
          
          landingAudioRef.current.addEventListener('error', (e) => {
            console.error("Error cargando audio de landing:", e);
          });
          
          // Configurar reproducción en bucle
          landingAudioRef.current.loop = true;
          
          // Precargar el audio
          landingAudioRef.current.preload = 'auto';
          
          // Detectar cuando el audio se ha cargado
          landingAudioRef.current.addEventListener('loadeddata', () => {
            console.log("Audio de landing cargado y listo para reproducir");
            setAudioLoaded(true);
          });
        }
        
        if (gameAudioRef.current) {
          gameAudioRef.current.addEventListener('canplaythrough', () => {
            console.log("Audio de juego cargado completamente");
          });
          
          gameAudioRef.current.addEventListener('error', (e) => {
            console.error("Error cargando audio de juego:", e);
          });
          
          // Configurar reproducción en bucle
          gameAudioRef.current.loop = true;
        }

        if (loginAudioRef.current) {
          loginAudioRef.current.addEventListener('canplaythrough', () => {
            console.log("Audio de login cargado completamente");
          });
          
          loginAudioRef.current.addEventListener('error', (e) => {
            console.error("Error cargando audio de login:", e);
          });
          
          // Configurar reproducción en bucle
          loginAudioRef.current.loop = true;
        }
        
        setAudioLoaded(true);
      } else {
        console.error("API de Audio no disponible en este navegador");
      }
    } catch (error) {
      console.error("Error al inicializar audio:", error);
    }
    
    // Función para detectar interacción del usuario
    const handleUserInteraction = () => {
      console.log("¡Interacción del usuario detectada!");
      hasInteractedRef.current = true;
      
      // Intentar reproducir música cuando hay interacción
      if (window.location.pathname === '/' || 
          window.location.pathname === '/login' || 
          window.location.pathname === '/register') {
        playLandingMusic();
      } else {
        playGameMusic();
      }
      
      // Limpiar evento después de la primera interacción
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
    
    // Agregar escuchas para interacción del usuario
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    
    // Cleanup al desmontar
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      
      if (landingAudioRef.current) {
        landingAudioRef.current.pause();
        landingAudioRef.current = null;
      }
      if (gameAudioRef.current) {
        gameAudioRef.current.pause();
        gameAudioRef.current = null;
      }
      if (loginAudioRef.current) {
        loginAudioRef.current.pause();
        loginAudioRef.current = null;
      }
    };
  }, []);
  
  // Aplicar volumen y mute a los elementos de audio
  useEffect(() => {
    if (landingAudioRef.current) {
      landingAudioRef.current.volume = isMuted ? 0 : volume;
    }
    if (gameAudioRef.current) {
      gameAudioRef.current.volume = isMuted ? 0 : volume;
    }
    if (loginAudioRef.current) {
      loginAudioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);
  
  // Pausar todas las pistas
  const pauseAllTracks = () => {
    console.log("Pausando todas las pistas...");
    if (landingAudioRef.current) {
      landingAudioRef.current.pause();
      console.log("Audio de landing pausado");
    }
    if (gameAudioRef.current) {
      gameAudioRef.current.pause();
      console.log("Audio de juego pausado");
    }
    if (loginAudioRef.current) {
      loginAudioRef.current.pause();
      console.log("Audio de login pausado");
    }
    setIsPlaying(false);
  };
  
  // Reproducir música de la landing page con mejor manejo de errores
  const playLandingMusic = async (): Promise<boolean> => {
    console.log("Intentando reproducir música de landing...");
    console.log("¿Usuario ha interactuado?", hasInteractedRef.current);
    console.log("¿Audio cargado?", audioLoaded);
    
    if (!audioLoaded) {
      console.warn("Audio no cargado aún");
      return false;
    }
    
    pauseAllTracks();
    
    if (landingAudioRef.current) {
      try {
        // Verificar si la fuente de audio es válida
        console.log("Estado del audio de landing:", landingAudioRef.current.readyState);
        console.log("Duración del audio:", landingAudioRef.current.duration);
        console.log("Ruta del audio:", landingAudioRef.current.src);
        
        // Si el audio no está listo, intentamos recargarlo
        if (landingAudioRef.current.readyState === 0) {
          console.log("Audio no listo, recargando...");
          landingAudioRef.current.load();
          // Esperar a que el audio se cargue
          await new Promise<void>((resolve) => {
            landingAudioRef.current!.addEventListener('canplaythrough', () => resolve(), { once: true });
            landingAudioRef.current!.addEventListener('error', () => {
              console.error("Error al recargar el audio");
              resolve();
            }, { once: true });
          });
        }
        
        landingAudioRef.current.currentTime = 0;
        console.log("Iniciando reproducción...");
        
        // Establecer directamente el volumen deseado sin iniciar en 0
        // Esto solucionará el problema del primer clic
        landingAudioRef.current.volume = isMuted ? 0 : volume;
        
        const playPromise = landingAudioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          
          console.log("Reproducción iniciada con éxito");
          setCurrentTrack('landing');
          setIsPlaying(true);
          return true;
        }
      } catch (err) {
        console.error("Error reproduciendo música de landing:", err);
        
        // Si falla, intentamos con un enfoque alternativo
        try {
          console.log("Intentando método alternativo...");
          // Crear un nuevo elemento de audio e intentar reproducirlo con la ruta ABSOLUTA correcta
          const newAudio = new Audio('/assets/audio/landing-theme.mp3');
          newAudio.loop = true;
          newAudio.volume = isMuted ? 0 : volume; // Usar volumen actual directamente
          
          await newAudio.play();
          
          // Si llega aquí, funcionó
          console.log("Reproducción alternativa exitosa");
          landingAudioRef.current = newAudio;
          setCurrentTrack('landing');
          setIsPlaying(true);
          return true;
        } catch (altErr) {
          console.error("También falló el método alternativo:", altErr);
          return false;
        }
      }
    }
    console.warn("No se pudo reproducir - referencia de audio no disponible");
    return false;
  };
  
  // Reproducir música del juego
  const playGameMusic = async (): Promise<boolean> => {
    console.log("Intentando reproducir música de juego...");
    console.log("¿Usuario ha interactuado?", hasInteractedRef.current);
    
    if (!audioLoaded) {
      console.warn("Audio no cargado aún");
      return false;
    }
    
    pauseAllTracks();
    
    if (gameAudioRef.current) {
      try {
        gameAudioRef.current.currentTime = 0;
        
        // Establecer volumen directamente
        gameAudioRef.current.volume = isMuted ? 0 : volume;
        
        const playPromise = gameAudioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          
          console.log("Reproducción de música de juego iniciada con éxito");
          setCurrentTrack('game');
          setIsPlaying(true);
          return true;
        }
      } catch (err) {
        console.error("Error reproduciendo música de juego:", err);
        return false;
      }
    }
    console.warn("No se pudo reproducir - referencia de audio no disponible");
    return false;
  };

  // Nueva función para reproducir música de login
  const playLoginMusic = async (): Promise<boolean> => {
    console.log("Intentando reproducir música de login...");
    console.log("¿Usuario ha interactuado?", hasInteractedRef.current);
    console.log("¿Audio cargado?", audioLoaded);
    
    if (!audioLoaded) {
      console.warn("Audio no cargado aún");
      return false;
    }
    
    pauseAllTracks();
    
    if (loginAudioRef.current) {
      try {
        // Verificar si la fuente de audio es válida
        console.log("Estado del audio de login:", loginAudioRef.current.readyState);
        console.log("Duración del audio:", loginAudioRef.current.duration);
        console.log("Ruta del audio:", loginAudioRef.current.src);
        
        // Si el audio no está listo, intentamos recargarlo
        if (loginAudioRef.current.readyState === 0) {
          console.log("Audio no listo, recargando...");
          loginAudioRef.current.load();
          // Esperar a que el audio se cargue
          await new Promise<void>((resolve) => {
            loginAudioRef.current!.addEventListener('canplaythrough', () => resolve(), { once: true });
            loginAudioRef.current!.addEventListener('error', () => {
              console.error("Error al recargar el audio");
              resolve();
            }, { once: true });
          });
        }
        
        loginAudioRef.current.currentTime = 0;
        console.log("Iniciando reproducción...");
        
        // Establecer directamente el volumen deseado
        loginAudioRef.current.volume = isMuted ? 0 : volume;
        
        const playPromise = loginAudioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          
          console.log("Reproducción iniciada con éxito");
          setCurrentTrack('login');
          setIsPlaying(true);
          return true;
        }
      } catch (err) {
        console.error("Error reproduciendo música de login:", err);
        
        // Si falla, intentamos con un enfoque alternativo
        try {
          console.log("Intentando método alternativo...");
          const newAudio = new Audio('/assets/audio/catacombs.mp3');
          newAudio.loop = true;
          newAudio.volume = isMuted ? 0 : volume;
          
          await newAudio.play();
          
          console.log("Reproducción alternativa exitosa");
          loginAudioRef.current = newAudio;
          setCurrentTrack('login');
          setIsPlaying(true);
          return true;
        } catch (altErr) {
          console.error("También falló el método alternativo:", altErr);
          return false;
        }
      }
    }
    console.warn("No se pudo reproducir - referencia de audio no disponible");
    return false;
  };
  
  // Detener toda la música
  const stopMusic = () => {
    pauseAllTracks();
    setCurrentTrack('none');
  };
  
  // Alternar reproducción/pausa
  const togglePlay = () => {
    console.log("Toggle play/pause...");
    console.log("Estado actual:", isPlaying ? "reproduciendo" : "pausado");
    console.log("Pista actual:", currentTrack);
    
    if (isPlaying) {
      pauseAllTracks();
    } else {
      // Asegurarnos de que haya un valor actual del track antes de intentar reproducir
      const track = currentTrack !== 'none' ? currentTrack : 'landing';
      
      if (track === 'landing') {
        // Al iniciar la reproducción, asegúrate que el volumen esté configurado correctamente
        if (landingAudioRef.current) {
          landingAudioRef.current.volume = isMuted ? 0 : volume;
        }
        playLandingMusic();
      } else if (track === 'game') {
        // Al iniciar la reproducción, asegúrate que el volumen esté configurado correctamente
        if (gameAudioRef.current) {
          gameAudioRef.current.volume = isMuted ? 0 : volume;
        }
        playGameMusic();
      } else if (track === 'login') {
        // Al iniciar la reproducción, asegúrate que el volumen esté configurado correctamente
        if (loginAudioRef.current) {
          loginAudioRef.current.volume = isMuted ? 0 : volume;
        }
        playLoginMusic();
      }
    }
  };
  
  // Ajustar volumen
  const setVolume = (newVolume: number) => {
    setVolumeState(newVolume);
  };
  
  // Alternar silencio
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };
  
  const value = {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    playLandingMusic,
    playGameMusic,
    playLoginMusic, // Añadir la nueva función al contexto
    stopMusic,
    togglePlay,
    setVolume,
    toggleMute,
  };
  
  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};
