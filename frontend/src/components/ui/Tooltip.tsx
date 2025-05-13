/*
* Componente Tooltip reutilizable
* Implementar:
* - Mostrar información adicional al pasar el ratón
* - Diferentes posiciones (arriba, abajo, izquierda, derecha)
* - Animaciones de entrada/salida
*/

import React, { useState, useRef, useEffect } from 'react';
import '../../styles/components/Tooltip.css';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 300,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const childRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Calcular posición del tooltip
  const calculatePosition = () => {
    if (!childRef.current || !tooltipRef.current) return;
    
    const childRect = childRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    
    let top, left;
    
    switch (position) {
      case 'top':
        top = childRect.top - tooltipRect.height - 8;
        left = childRect.left + (childRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'bottom':
        top = childRect.bottom + 8;
        left = childRect.left + (childRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'left':
        top = childRect.top + (childRect.height / 2) - (tooltipRect.height / 2);
        left = childRect.left - tooltipRect.width - 8;
        break;
      case 'right':
        top = childRect.top + (childRect.height / 2) - (tooltipRect.height / 2);
        left = childRect.right + 8;
        break;
      default:
        top = childRect.top - tooltipRect.height - 8;
        left = childRect.left + (childRect.width / 2) - (tooltipRect.width / 2);
    }
    
    // Evitar que el tooltip salga de la ventana
    if (left < 0) left = 0;
    if (top < 0) top = 0;
    if (left + tooltipRect.width > window.innerWidth) {
      left = window.innerWidth - tooltipRect.width;
    }
    if (top + tooltipRect.height > window.innerHeight) {
      top = window.innerHeight - tooltipRect.height;
    }
    
    setTooltipStyle({ top, left });
  };
  
  // Mostrar tooltip después del delay
  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
      // Calcular posición después de que el tooltip sea visible
      setTimeout(calculatePosition, 0);
    }, delay);
  };
  
  // Ocultar tooltip y cancelar timer si existe
  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsVisible(false);
  };
  
  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
  
  return (
    <div className="tooltip-container">
      <div 
        ref={childRef}
        className="tooltip-trigger"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`tooltip tooltip-${position} ${className}`}
          style={tooltipStyle}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
