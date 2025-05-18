/*
* Componente para mostrar los recursos del jugador
* Implementar:
* - Iconos para cada tipo de recurso
* - Cantidades actuales
* - Animaciones al cambiar recursos
*/

import React from 'react';
import { Resources } from '../../types/game';
import '../../styles/components/ResourceBar.css';

interface ResourceBarProps {
  resources: Resources;
  resourcesIncome?: Resources; // Ingresos por turno (opcional)
}

const ResourceBar: React.FC<ResourceBarProps> = ({ resources, resourcesIncome }) => {
  // Si no hay ingresos, mostrar valores en cero
  const income = resourcesIncome || { gold: 0, wood: 0, stone: 0 };
  
  return (
    <div className="resource-bar">
      <div className="resource gold">
        <span className="resource-icon">💰</span>
        <span className="resource-value">{resources.gold}</span>
        {income.gold > 0 && (
          <span className="resource-income">+{income.gold}/turno</span>
        )}
      </div>
      
      <div className="resource wood">
        <span className="resource-icon">🌲</span>
        <span className="resource-value">{resources.wood}</span>
        {income.wood > 0 && (
          <span className="resource-income">+{income.wood}/turno</span>
        )}
      </div>
      
      <div className="resource stone">
        <span className="resource-icon">⛏️</span>
        <span className="resource-value">{resources.stone}</span>
        {income.stone > 0 && (
          <span className="resource-income">+{income.stone}/turno</span>
        )}
      </div>
    </div>
  );
};

export default ResourceBar;
