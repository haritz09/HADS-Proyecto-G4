import { GameState, VisibleObject, MapTile, ArtifactObject, ResourceMine } from '../types/game';

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
  
  console.log(`DEBUG syncArtifactsWithTiles: Encontrados ${artifacts.length} artefactos para sincronizar`);
  
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
        console.log(`DEBUG syncArtifactsWithTiles: Marcado tile (${x},${y}) como artefacto con id ${artifact.id}`);
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
  
  // Log complete list of visible_objects for debugging
  console.log("DEBUG syncMinesWithTiles [2]: All visible objects:", gameState.map.visible_objects.map(obj => ({
    id: obj.id,
    type: obj.type,
    resource_type: 'resource_type' in obj ? obj.resource_type : undefined,
    position: obj.position,
    owner: obj.owner
  })));
  
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
      console.log(`DEBUG syncMinesWithTiles [3]: Restaurando tipo '${obj.type}' para mina con resource_type ${obj.resource_type} at position:`, obj.position);
    }
  });
  
  if (mineRestorationCount > 0) {
    console.log(`DEBUG syncMinesWithTiles [4]: Restored type for ${mineRestorationCount} mines that were missing type`);
  }
  
  // Identificar minas en visible_objects con mucho detalle en el criterio de filtrado
  const mines = updatedGameState.map.visible_objects.filter(obj => {
    const isMineByType = obj.type === 'goldmine' || obj.type === 'sawmill' || obj.type === 'quarry';
    const isMineByResourceType = 'resource_type' in obj && 
      (obj.resource_type === 'gold' || obj.resource_type === 'wood' || obj.resource_type === 'stone');
    
    return isMineByType || isMineByResourceType;
  });
  
  console.log(`DEBUG syncMinesWithTiles [5]: Found ${mines.length} mines after filtering`);
  
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
        console.log(`DEBUG syncMinesWithTiles [6]: Marcado tile (${x},${y}) como mina con id ${mine.id}`);
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
  
  console.log(`findArtifactAtPosition: Searching for artifact at (${x}, ${y})`);
  
  // Método 1: Buscar por tile (más confiable)
  const index = y * gameState.map.size.width + x;
  if (index >= 0 && index < gameState.map.tiles.length) {
    const tile = gameState.map.tiles[index];
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
