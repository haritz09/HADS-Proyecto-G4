/*
* Funciones de ayuda generales
* Implementar:
* - Formato de números y fechas
* - Manipulación de objetos y arrays
* - Validaciones comunes
*/

// Formatear número con separador de miles
export const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Formatear fecha en formato legible
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Generar un ID único
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Clonar objeto de forma profunda
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

// Calcular porcentaje
export const calculatePercent = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

// Limitar un número entre un mínimo y un máximo
export const clamp = (num: number, min: number, max: number): number => {
  return Math.min(Math.max(num, min), max);
};

// Verificar si dos posiciones son iguales
export const isSamePosition = (pos1: {x: number, y: number}, pos2: {x: number, y: number}): boolean => {
  return pos1.x === pos2.x && pos1.y === pos2.y;
};

// Calcular distancia Manhattan entre dos posiciones
export const manhattanDistance = (pos1: {x: number, y: number}, pos2: {x: number, y: number}): number => {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
};

// Truncar texto si es demasiado largo
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

// Convertir segundos en formato mm:ss
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Detectar si el dispositivo es móvil
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};
