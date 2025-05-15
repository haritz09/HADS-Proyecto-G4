/*
* Componente para mostrar los recursos del jugador
* Implementar:
* - Iconos para cada tipo de recurso
* - Cantidades actuales
* - Animaciones al cambiar recursos
*/

import { useState } from 'react';
import { Resources } from '../../types/game';
import '../../styles/components/ResourceBar.css';

interface ResourceBarProps {
  resources: Resources;
}

const ResourceBar: React.FC<ResourceBarProps> = ({ resources }) => {
  const [animatedValues, setAnimatedValues] = useState(resources);

  return (
    <div className="resource-bar">
      {/* Solo mostrar recursos básicos */}
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
    </div>
  );
};

export default ResourceBar;
