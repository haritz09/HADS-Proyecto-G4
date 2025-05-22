import { GameState, VisibleObject, MapTile, ArtifactObject, ResourceMine } from '../types/game';
import { TileVisibility } from '../constants/gameConstants';

/**
 * Sincroniza los artefactos en visible_objects con los tiles del mapa
 * para garantizar que ambos sistemas de detección funcionen
 */
export const syncArtifactsWithTiles = (gameState: GameState): GameState => {
  if (!gameState?.map?.visible_objects?.length || !gameState?.map?.tiles?.length) return gameState;

  const updatedGameState = { ...gameState };
  const mapWidth = gameState.map.size.width;
  const mapHeight = gameState.map.size.height;
  
  // Identificar artefactos en visible_objects con validación mejorada
  const artifacts = gameState.map.visible_objects.filter(obj => 
    obj.type === 'artifact' || 
    (obj && typeof obj === 'object' && 'subtype' in obj && typeof obj.subtype === 'string')
  );
  
  
  // Crear copias de los tiles para no modificar directamente el estado
  const updatedTiles = [...gameState.map.tiles];
  
  // Marcar posiciones de artefactos en los tiles
  artifacts.forEach(artifact => {
    if (artifact.position) {
      const { x, y } = artifact.position;
      const idx = y * mapWidth + x;
      
      if (idx >= 0 && idx < updatedTiles.length) {
        // Actualizar el tile con la información del artefacto
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
 * Sincroniza las minas en visible_objects con los tiles del mapa
 * para garantizar que ambos sistemas de detección funcionen
 */
export const syncMinesWithTiles = (gameState: GameState): GameState => {
  if (!gameState?.map?.visible_objects?.length || !gameState?.map?.tiles?.length) {
    console.log("DEBUG syncMinesWithTiles [1]: No visible_objects or tiles found");
    return gameState;
  }

  const updatedGameState = { ...gameState };
  const mapWidth = gameState.map.size.width;
  

  
  // CRÍTICO: Restaurar los tipos faltantes si solo tienen resource_type
  let mineRestorationCount = 0;
  updatedGameState.map.visible_objects.forEach(obj => {
    if ('resource_type' in obj && !obj.type) {
      const resourceMapping = {
        'gold': 'goldmine',
        'wood': 'sawmill',
        'stone': 'quarry'
      };
      obj.type = resourceMapping[obj.resource_type as keyof typeof resourceMapping] || 'mine';
      mineRestorationCount++;
    }
  });
  
  if (mineRestorationCount > 0) {
    console.log(`DEBUG syncMinesWithTiles [2]: Restored ${mineRestorationCount} mine types`);
  }
  
  // Identificar minas en visible_objects con mucho detalle en el criterio de filtrado
  const mines = updatedGameState.map.visible_objects.filter(obj => {
    const isMineByType = obj.type === 'goldmine' || obj.type === 'sawmill' || obj.type === 'quarry';
    const isMineByResourceType = 'resource_type' in obj && 
      (obj.resource_type === 'gold' || obj.resource_type === 'wood' || obj.resource_type === 'stone');
    
    return isMineByType || isMineByResourceType;
  });
  
  
  // Crear copias de los tiles para no modificar directamente el estado
  const updatedTiles = [...gameState.map.tiles];
  
  // Marcar posiciones de minas en los tiles
  mines.forEach(mine => {
    if (mine.position) {
      const { x, y } = mine.position;
      const idx = y * mapWidth + x;
      
      if (idx >= 0 && idx < updatedTiles.length) {
        // Actualizar el tile con la información de la mina
        updatedTiles[idx] = {
          ...updatedTiles[idx],
          object_type: 'mine',
          object_id: mine.id
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

export const findArtifactAtPosition = (
  x: number, 
  y: number, 
  gameState: GameState
): VisibleObject | null => {
  if (!gameState?.map) {
    console.log(`findArtifactAtPosition: No gameState.map available`);
    return null;
  }
  
  // Check if the position is currently visible (not in fog of war)
  const index = y * gameState.map.size.width + x;
  if (index >= 0 && index < gameState.map.fog_of_war.length) {
    // Only find artifacts in currently visible areas (not just explored)
    if (gameState.map.fog_of_war[index]) {
      return null; // Position is in fog of war, don't show artifacts
    }
  }
  
  console.log(`findArtifactAtPosition: Searching for artifact at (${x}, ${y})`);
  
  // Método 1: Buscar por tile (más confiable)
  const tileIndex = y * gameState.map.size.width + x;
  if (tileIndex >= 0 && tileIndex < gameState.map.tiles.length) {
    const tile = gameState.map.tiles[tileIndex];
    console.log(`findArtifactAtPosition: Tile at (${x},${y})`, 
      {object_type: tile.object_type, object_id: tile.object_id});
    
    if (tile?.object_type === 'artifact' && tile?.object_id) {
      console.log(`findArtifactAtPosition: Tile has artifact with ID ${tile.object_id}`);
      // Encontrar el artefacto correspondiente en visible_objects
      const artifact = gameState.map.visible_objects?.find(obj => obj.id === tile.object_id);
      if (artifact) {
        console.log(`findArtifactAtPosition: Found artifact by ID ${tile.object_id} in visible_objects`);
        return artifact;
      } else {
        console.log(`findArtifactAtPosition: Artifact with ID ${tile.object_id} not found in visible_objects`);
      }
    }
  }
  
  // Método 2: Buscar directamente en visible_objects por posición
  if (gameState.map.visible_objects && gameState.map.visible_objects.length > 0) {
    console.log(`findArtifactAtPosition: Searching among ${gameState.map.visible_objects.length} visible objects`);
    
    const artifactsAtPosition = gameState.map.visible_objects.filter(obj => {
      const isArtifact = obj.type === 'artifact' || 'subtype' in obj;
      const isAtPosition = obj.position?.x === x && obj.position?.y === y;
      if (isArtifact) console.log(`findArtifactAtPosition: Found artifact object with ID ${obj.id}`);
      if (isAtPosition) console.log(`findArtifactAtPosition: Found object at position (${x},${y}): ${obj.id}`);
      return isArtifact && isAtPosition;
    });
    
    if (artifactsAtPosition.length > 0) {
      console.log(`findArtifactAtPosition: Found ${artifactsAtPosition.length} artifacts at position (${x},${y})`);
      return artifactsAtPosition[0];
    } else {
      console.log(`findArtifactAtPosition: No artifacts found at position (${x},${y})`);
    }
  } else {
    console.log(`findArtifactAtPosition: No visible objects array or empty`);
  }
  
  return null;
};

// Add a utility function to help determine a tile's visibility state
export const getTileVisibilityState = (
  x: number, 
  y: number, 
  gameState: GameState
): TileVisibility => {
  const index = y * gameState.map.size.width + x;
  
  // Ensure index is valid
  if (index < 0 || index >= gameState.map.fog_of_war.length) {
    return TileVisibility.UNEXPLORED;
  }
  
  // If the tile is currently visible (not in fog of war)
  if (!gameState.map.fog_of_war[index]) {
    return TileVisibility.VISIBLE;
  }
  
  // If the tile is explored but not currently visible
  if (gameState.map.explored && gameState.map.explored[index]) {
    return TileVisibility.EXPLORED;
  }
  
  return TileVisibility.UNEXPLORED;
};
