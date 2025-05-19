import React from 'react';
import { usePerformance } from '../../contexts/PerformanceContext';
import '../../styles/components/PerformanceSettings.css';

interface PerformanceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Componente que permite al usuario ajustar la configuración de rendimiento
 * y animaciones del juego
 */
const PerformanceSettings: React.FC<PerformanceSettingsProps> = ({ isOpen, onClose }) => {
  const { 
    lowPerformanceMode, 
    toggleLowPerformanceMode, 
    animationsEnabled, 
    toggleAnimations,
    detectedLowPerformance
  } = usePerformance();
  
  if (!isOpen) return null;
  
  return (
    <div className="performance-settings-modal">
      <div className="performance-settings-content">
        <h2>Ajustes de rendimiento</h2>
        
        {detectedLowPerformance && (
          <div className="performance-warning">
            <p>⚠️ Hemos detectado que estás usando un dispositivo que podría tener dificultades con los efectos visuales.</p>
          </div>
        )}
        
        <div className="setting-option">
          <label htmlFor="low-performance-toggle">Modo de bajo rendimiento</label>
          <div className="toggle-switch">
            <input 
              type="checkbox" 
              id="low-performance-toggle"
              checked={lowPerformanceMode}
              onChange={toggleLowPerformanceMode}
            />
            <span className="toggle-slider"></span>
          </div>
          <p className="setting-description">
            Reduce los efectos visuales y animaciones para mejorar el rendimiento en dispositivos de menor capacidad.
          </p>
        </div>
        
        <div className="setting-option">
          <label htmlFor="animations-toggle">Animaciones</label>
          <div className="toggle-switch">
            <input 
              type="checkbox" 
              id="animations-toggle"
              checked={animationsEnabled}
              onChange={toggleAnimations}
            />
            <span className="toggle-slider"></span>
          </div>
          <p className="setting-description">
            Activa o desactiva todas las animaciones del juego. Desactivarlas puede mejorar el rendimiento.
          </p>
        </div>
        
        <div className="performance-tips">
          <h3>Consejos para mejorar el rendimiento</h3>
          <ul>
            <li>Cierra otras aplicaciones y pestañas del navegador mientras juegas</li>
            <li>Juega con el navegador en modo ventana en lugar de pantalla completa</li>
            <li>Desactiva las extensiones del navegador que no necesites</li>
            <li>En dispositivos móviles, asegúrate de tener suficiente batería y memoria disponible</li>
          </ul>
        </div>
        
        <button className="close-button" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
};

export default PerformanceSettings;
