import React, { createContext, useContext, useState, useEffect } from 'react';

interface PerformanceContextType {
  lowPerformanceMode: boolean;
  toggleLowPerformanceMode: () => void;
  animationsEnabled: boolean;
  toggleAnimations: () => void;
  detectedLowPerformance: boolean;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

/**
 * Proveedor de contexto para gestionar las preferencias de rendimiento y animaciones
 * Detecta automáticamente dispositivos de baja capacidad y permite al usuario
 * ajustar las preferencias manualmente
 */
export const PerformanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Estado para el modo de bajo rendimiento
  const [lowPerformanceMode, setLowPerformanceMode] = useState<boolean>(
    localStorage.getItem('lowPerformanceMode') === 'true'
  );
  
  // Estado para habilitar/deshabilitar animaciones
  const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(
    localStorage.getItem('animationsEnabled') !== 'false' // Habilitado por defecto
  );
  
  // Estado para detección automática de dispositivos de baja capacidad
  const [detectedLowPerformance, setDetectedLowPerformance] = useState<boolean>(false);
  
  // Detectar dispositivos de baja capacidad al inicio
  useEffect(() => {
    const detectPerformance = () => {
      // Criterios para considerar un dispositivo de baja capacidad:
      // 1. Menos de 4 núcleos lógicos
      // 2. Usuario de dispositivo móvil
      // 3. Navegador antiguo que no soporte ciertas características
      
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const hasLowCores = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
      
      // Crear un canvas y probar rendimiento de WebGL como indicador adicional
      let webGLPerformance = false;
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
          webGLPerformance = true; // WebGL no disponible
        }
      } catch (e) {
        webGLPerformance = true;
      }
      
      const isLowPerformance = isMobile || hasLowCores || webGLPerformance;
      
      setDetectedLowPerformance(isLowPerformance);
      
      // Sugerir activar modo de bajo rendimiento si se detecta, pero respetar la elección del usuario
      if (isLowPerformance && localStorage.getItem('lowPerformanceMode') === null) {
        setLowPerformanceMode(true);
        localStorage.setItem('lowPerformanceMode', 'true');
      }
    };
    
    detectPerformance();
  }, []);
  
  // Aplicar clases CSS basadas en el modo de rendimiento
  useEffect(() => {
    const rootElement = document.documentElement;
    
    if (lowPerformanceMode) {
      rootElement.classList.add('low-performance-mode');
    } else {
      rootElement.classList.remove('low-performance-mode');
    }
    
    if (!animationsEnabled) {
      rootElement.classList.add('animations-disabled');
    } else {
      rootElement.classList.remove('animations-disabled');
    }
  }, [lowPerformanceMode, animationsEnabled]);
  
  // Función para alternar el modo de bajo rendimiento
  const toggleLowPerformanceMode = () => {
    const newValue = !lowPerformanceMode;
    setLowPerformanceMode(newValue);
    localStorage.setItem('lowPerformanceMode', String(newValue));
  };
  
  // Función para alternar las animaciones
  const toggleAnimations = () => {
    const newValue = !animationsEnabled;
    setAnimationsEnabled(newValue);
    localStorage.setItem('animationsEnabled', String(newValue));
  };
  
  return (
    <PerformanceContext.Provider 
      value={{
        lowPerformanceMode,
        toggleLowPerformanceMode,
        animationsEnabled,
        toggleAnimations,
        detectedLowPerformance
      }}
    >
      {children}
    </PerformanceContext.Provider>
  );
};

// Hook personalizado para usar el contexto de rendimiento
export const usePerformance = (): PerformanceContextType => {
  const context = useContext(PerformanceContext);
  if (context === undefined) {
    throw new Error('usePerformance debe usarse dentro de un PerformanceProvider');
  }
  return context;
};
