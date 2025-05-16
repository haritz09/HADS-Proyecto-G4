import React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import '../styles/pages/MapViewPage.css';

// Definición de tipo para las celdas del mapa
interface Tile {
  id: string;
  type: string;
  grassIndex: number;
}

// Intentar varias rutas posibles para las imágenes
const GRASS_IMAGE_PATHS = [
  // Ruta absoluta en carpeta public
  '/assets/images/tiles/grass/grass_01.png',
  // Rutas alternativas que podríamos probar
  './assets/images/tiles/grass/grass_01.png',
  '../assets/images/tiles/grass/grass_01.png'
];

// Nombres de archivos de césped
const GRASS_FILENAMES = [
  'grass_01.png',
  'grass_02.png',
  'grass_03.png',
  'grass_04.png'
];

const MapViewPage: React.FC = () => {
  const navigate = useNavigate();
  const [map, setMap] = useState<Tile[][]>([]);
  const [loading, setLoading] = useState(true);
  const [basePath, setBasePath] = useState('');
  const [pathTested, setPathTested] = useState(false);
  
  // Configuración del mapa
  const mapWidth = 20;
  const mapHeight = 15;

  // Comprobar qué ruta funciona
  useEffect(() => {
    const checkImagePaths = async () => {
      console.log("Comprobando rutas de imágenes...");
      
      for (const path of GRASS_IMAGE_PATHS) {
        try {
          // Intentar cargar la primera imagen con esta ruta base
          console.log(`Intentando ruta: ${path}`);
          
          const response = await fetch(path);
          if (response.ok) {
            console.log(`¡Éxito! Ruta encontrada: ${path}`);
            // Extraer el directorio base de la ruta exitosa
            const basePath = path.substring(0, path.lastIndexOf('/') + 1);
            setBasePath(basePath);
            setPathTested(true);
            break;
          } else {
            console.log(`Ruta no encontrada: ${path}, status: ${response.status}`);
          }
        } catch (error) {
          console.error(`Error al probar ruta ${path}:`, error);
        }
      }
      
      // Si ninguna ruta funcionó, usar la primera para que al menos muestre los mensajes de error
      if (!basePath) {
        console.warn("No se encontró ninguna ruta válida, usando la primera por defecto");
        setBasePath('/assets/images/tiles/grass/');
        setPathTested(true);
      }
    };
    
    checkImagePaths();
  }, []);
  
  // Generar mapa una vez que se determinó la ruta base
  useEffect(() => {
    if (pathTested) {
      generateRandomMap();
    }
  }, [pathTested]);
  
  const generateRandomMap = () => {
    setLoading(true);
    
    const newMap: Tile[][] = [];
    
    for (let y = 0; y < mapHeight; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < mapWidth; x++) {
        // Seleccionar aleatoriamente un tipo de césped
        const randomIndex = Math.floor(Math.random() * GRASS_FILENAMES.length);
        
        row.push({
          id: `tile-${x}-${y}`,
          type: 'grass',
          grassIndex: randomIndex
        });
      }
      newMap.push(row);
    }
    
    setMap(newMap);
    setLoading(false);
  };
  
  const handleRefreshMap = () => {
    generateRandomMap();
  };
  
  const handleBackToMenu = () => {
    navigate('/menu');
  };
  
  // Función para obtener la URL de la imagen basada en el índice
  const getImageSrc = (grassIndex: number) => {
    return `${basePath}${GRASS_FILENAMES[grassIndex]}`;
  };
  
  if (loading) {
    return <div className="loading-screen">Generando mapa...</div>;
  }
  
  return (
    <div className="map-view-page">
      <div className="map-view-header">
        <h1>Visor de Mapa</h1>
        <div className="map-controls">
          <Button onClick={handleRefreshMap}>Generar Nuevo Mapa</Button>
          <Button onClick={handleBackToMenu}>Volver al Menú</Button>
        </div>
      </div>
      
      <div className="map-container">
        <div 
          className="game-map-grid" 
          style={{ 
            gridTemplateColumns: `repeat(${mapWidth}, 48px)`,
            gridTemplateRows: `repeat(${mapHeight}, 48px)`
          }}
        >
          {map.flat().map((tile) => (
            <div key={tile.id} className="map-tile">
              <img 
                src={getImageSrc(tile.grassIndex)} 
                alt={`Tile ${tile.type}`} 
                className="tile-image"
                onError={(e) => {
                  // Capturar más información sobre el error
                  const target = e.target as HTMLImageElement;
                  const failedSrc = target.src;
                  
                  console.error(`Error cargando imagen: ${failedSrc}`);
                  
                  // Si falla la carga, mostrar un color como fallback y un mensaje
                  const index = tile.grassIndex % 4;
                  const colors = ['#8eb22c', '#669922', '#548c18', '#7cac26'];
                  
                  // Crear un div con el mensaje de error detallado
                  const errorMessage = document.createElement('div');
                  errorMessage.innerHTML = `<div>Imagen no encontrada:<br>${failedSrc.split('/').pop()}</div>`;
                  errorMessage.style.position = 'absolute';
                  errorMessage.style.top = '0';
                  errorMessage.style.left = '0';
                  errorMessage.style.width = '100%';
                  errorMessage.style.height = '100%';
                  errorMessage.style.display = 'flex';
                  errorMessage.style.justifyContent = 'center';
                  errorMessage.style.alignItems = 'center';
                  errorMessage.style.backgroundColor = colors[index];
                  errorMessage.style.color = 'white';
                  errorMessage.style.fontSize = '8px';
                  errorMessage.style.textAlign = 'center';
                  errorMessage.style.fontWeight = 'bold';
                  
                  // Añadir el mensaje al padre del target (la celda del mapa)
                  target.parentNode?.appendChild(errorMessage);
                  
                  // Ocultar la imagen
                  target.style.display = 'none';
                }}  
              />
            </div>
          ))}
        </div>
      </div>
      
      <div className="map-info">
        <h3>Información del mapa</h3>
        <p>Ruta de imágenes: <code>{basePath}</code></p>
        <p>Archivos necesarios: {GRASS_FILENAMES.join(', ')}</p>
        <p>
          Para solucionar este problema:<br/>
          1. Verifica que las imágenes existan en la carpeta <code>public{basePath}</code><br/>
          2. Crea las carpetas si no existen<br/>
          3. Asegúrate de que los nombres de archivo sean exactos
        </p>
      </div>
    </div>
  );
};

export default MapViewPage;
