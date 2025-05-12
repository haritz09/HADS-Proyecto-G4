/*
* Componente Modal reutilizable
* Implementar:
* - Ventana modal con overlay
* - Capacidad para cerrar al hacer clic fuera
* - Animaciones de entrada/salida
* - Soporte para contenido personalizado
*/

import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import '../../styles/components/Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  closeOnOutsideClick?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  closeOnOutsideClick = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Cerrar modal con ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  // Evitar que el clic dentro del modal cierre el modal
  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  // Si el modal no está abierto, no renderizar nada
  if (!isOpen) return null;
  
  // Portal para renderizar fuera del flujo del DOM
  return ReactDOM.createPortal(
    <div 
      className="modal-overlay"
      onClick={closeOnOutsideClick ? onClose : undefined}
    >
      <div 
        ref={modalRef}
        className={`modal modal-${size}`}
        onClick={handleModalClick}
      >
        {title && (
          <div className="modal-header">
            <h2>{title}</h2>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        )}
        
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>,
    document.getElementById('portal-root') as HTMLElement
  );
};

export default Modal;
