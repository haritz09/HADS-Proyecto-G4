/*
* Componente para mostrar los recursos del jugador
* Implementar:
* - Iconos para cada tipo de recurso
* - Cantidades actuales
* - Animaciones al cambiar recursos
*/

import { useEffect, useState } from 'react';
import { Resources } from '../../types/game';
import '../../styles/components/ResourceBar.css';

interface ResourceBarProps {
  resources: Resources;
}

const ResourceBar: React.FC<ResourceBarProps> = ({ resources }) => {
  // Estado para animaciones
  const [animatedValues, setAnimatedValues] = useState<Resources>(resources);
  
  // Actualizar animaciones cuando cambian los recursos
  useEffect(() => {
    // Animación simple: actualizar gradualmente los valores
    const updateAnimation = () => {
      setAnimatedValues(prev => {
        let updated = false;
        const newValues = { ...prev };
        
        // Para cada recurso, acercarse gradualmente al valor objetivo
        Object.keys(resources).forEach(key => {
          const resourceKey = key as keyof Resources;
          const target = resources[resourceKey];
          const current = prev[resourceKey];
          
          if (current !== target) {
            updated = true;
            // Mover hacia el objetivo a una velocidad proporcional a la diferencia
            const diff = target - current;
            const step = Math.sign(diff) * Math.max(1, Math.abs(diff) / 10);
            
            // Si estamos cerca del objetivo, llegar exactamente
            if (Math.abs(diff) < Math.abs(step)) {
              newValues[resourceKey] = target;
            } else {
              newValues[resourceKey] = current + step;
            }
          }
        });
        
        return updated ? newValues : prev;
      });
    };
    
    // Actualizar la animación cada 50ms
    const interval = setInterval(updateAnimation, 50);
    return () => clearInterval(interval);
  }, [resources]);

  return (
    <div className="resource-bar">
      <div className="resource-item">
        <div className="resource-icon gold-icon"></div>
        <span className="resource-value">{Math.floor(animatedValues.gold)}</span>
      </div>
      
      <div className="resource-item">
        <div className="resource-icon wood-icon"></div>
        <span className="resource-value">{Math.floor(animatedValues.wood)}</span>
      </div>
      
      <div className="resource-item">
        <div className="resource-icon stone-icon"></div>
        <span className="resource-value">{Math.floor(animatedValues.stone)}</span>
      </div>
      
      <div className="resource-item">
        <div className="resource-icon gems-icon"></div>
        <span className="resource-value">{Math.floor(animatedValues.gems)}</span>
      </div>
      
      <div className="resource-item">
        <div className="resource-icon crystal-icon"></div>
        <span className="resource-value">{Math.floor(animatedValues.crystal)}</span>
      </div>
    </div>
  );
};

export default ResourceBar;
