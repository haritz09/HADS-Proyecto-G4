/*
* Componente reutilizable para botones
* Implementar:
* - Diferentes variantes (primario, secundario, peligro)
* - Diferentes tamaños
* - Estados (hover, active, disabled)
* - Sonido al hacer clic
*/

import React from 'react';
import '../../styles/components/Button.css';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onClick,
  className = '',
  children,
}) => {
  const handleClick = () => {
    // Reproducir sonido de clic
    const sound = new Audio('/assets/sounds/button-click.mp3');
    sound.volume = 0.5;
    sound.play().catch(err => console.error("Error playing sound:", err));
    
    // Ejecutar función onClick
    if (onClick) onClick();
  };

  return (
    <button
      className={`button button-${variant} button-${size} ${className} ${disabled ? 'disabled' : ''}`}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;
