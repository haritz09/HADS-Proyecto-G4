import { GameState, VisibleObject, MapTile, ArtifactObject } from '../types/game';

/**
 * Sincroniza los artefactos en visible_objects con los tiles del mapa
 * para garantizar que ambos sistemas de detección funcionen
 */
export const syncArtifactsWithTiles = (gameState: GameState): GameState => {
  if (!gameState?.map?.visible_objects?.length || !gameState?.map?.tiles?.length) return gameState;

  const updatedGameState = { ...gameState };
  const mapWidth = gameState.map.size.width;
  const mapHeight = gameState.map.size.height;
  
  // Identificar artefactos en visible_objects
  const artifacts = gameState.map.visible_objects.filter(obj => 
    obj.type === 'artifact' || 'subtype' in obj
  );
  
  // Crear copias de los tiles para no modificar directamente el estado
  const updatedTiles = [...gameState.map.tiles];
  
  // Marcar posiciones de artefactos en los tiles
  artifacts.forEach(artifact => {
    if (artifact.position) {
      const { x, y } = artifact.position;
      const idx = y * mapWidth + x;
      
      if (idx >= 0 && idx < updatedTiles.length) {
        // No modificar arrays inmutables directamente
        updatedTiles[idx] = {
          ...updatedTiles[idx],
          object_type: 'artifact',
          object_id: artifact.id
        };
      }
    }
  });
  
  // Actualizar el objeto de estado sin modificar la referencia original
  return {
    ...gameState,
    map: {
      ...gameState.map,
      tiles: updatedTiles
    }
  };
};

/**
 * Función auxiliar para buscar artefactos en una posición específica
 */
export const findArtifactAtPosition = (
  x: number, 
  y: number, 
  gameState: GameState
): VisibleObject | null => {
  if (!gameState?.map) return null;
  
  // Método 1: Buscar por tile
  const index = y * gameState.map.size.width + x;
  const tile = gameState.map.tiles[index];
  
  if (tile?.object_type === 'artifact' && tile?.object_id) {
    // Encontrar el artefacto correspondiente en visible_objects
    const artifact = gameState.map.visible_objects?.find(obj => obj.id === tile.object_id);
    if (artifact) return artifact;
  }
  
  // Método 2: Buscar directamente en visible_objects por posición
  return gameState.map.visible_objects?.find(obj => 
    (obj.type === 'artifact' || 'subtype' in obj) && 
    obj.position?.x === x && obj.position?.y === y
  ) || null;
};
