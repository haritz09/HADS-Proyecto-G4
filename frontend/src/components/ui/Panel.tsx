/*
* Componente Panel reutilizable
* Implementar:
* - Panel con borde y fondo estilizados
* - Encabezado opcional
* - Diferentes variantes de estilo
*/

import React from 'react';
import '../../styles/components/Panel.css';

interface PanelProps {
  title?: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'dark';
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

const Panel: React.FC<PanelProps> = ({
  title,
  children,
  variant = 'primary',
  className = '',
  collapsible = false,
  defaultCollapsed = false,
}) => {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
  
  const toggleCollapse = () => {
    if (collapsible) {
      setCollapsed(!collapsed);
    }
  };
  
  return (
    <div className={`panel panel-${variant} ${className} ${collapsed ? 'collapsed' : ''}`}>
      {title && (
        <div 
          className={`panel-header ${collapsible ? 'collapsible' : ''}`}
          onClick={toggleCollapse}
        >
          <h3>{title}</h3>
          {collapsible && (
            <span className="collapse-icon">
              {collapsed ? '+' : '-'}
            </span>
          )}
        </div>
      )}
      
      <div className="panel-content">
        {children}
      </div>
    </div>
  );
};

export default Panel;
