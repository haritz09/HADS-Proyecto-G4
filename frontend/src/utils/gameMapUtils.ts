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
    const isMineByResource = 'resource_type' in obj && ['gold', 'wood', 'stone'].includes(obj.resource_type as string);
    const hasMineKeywords = obj.type && (obj.type.includes('mine') || obj.type.includes('gold') || 
                                       obj.type.includes('wood') || obj.type.includes('stone'));
    
    const result = isMineByType || isMineByResource || hasMineKeywords;
    
    // Detailed logging for each object
    if (result) {
      console.log(`DEBUG syncMinesWithTiles [5]: Identified mine:`, {
        id: obj.id,
        type: obj.type,
        resource_type: 'resource_type' in obj ? obj.resource_type : undefined,
        position: obj.position,
        matched: isMineByType ? 'by type' : (isMineByResource ? 'by resource_type' : 'by keywords')
      });
    }
    
    return result;
  });
  
  console.log(`DEBUG syncMinesWithTiles [6]: Sincronizando ${mines.length} minas con tiles del mapa`);
  
  // Crear copias de los tiles para no modificar directamente el estado
  const updatedTiles = [...gameState.map.tiles];
  
  // Marcar posiciones de minas en los tiles
  mines.forEach(mine => {
    if (mine.position) {
      const { x, y } = mine.position;
      const idx = y * mapWidth + x;
      
      if (idx >= 0 && idx < updatedTiles.length) {
        // No modificar arrays inmutables directamente
        updatedTiles[idx] = {
          ...updatedTiles[idx],
          object_type: 'mine',
          object_id: mine.id
        };
        console.log(`DEBUG syncMinesWithTiles [7]: Marked tile at (${x},${y}) as mine with id ${mine.id}`);
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

/**
 * Función auxiliar para buscar minas en una posición específica
 */
export const findMineAtPosition = (
  x: number, 
  y: number, 
  gameState: GameState
): VisibleObject | null => {
  if (!gameState?.map) return null;
  
  // Método 1: Buscar por tile
  const index = y * gameState.map.size.width + x;
  const tile = gameState.map.tiles[index];
  
  if (tile?.object_type === 'mine' && tile?.object_id) {
    // Encontrar la mina correspondiente en visible_objects
    const mine = gameState.map.visible_objects?.find(obj => obj.id === tile.object_id);
    if (mine) return mine;
  }
  
  // Método 2: Buscar directamente en visible_objects por posición y tipo
  return gameState.map.visible_objects?.find(obj => {
    const isMineByType = obj.type === 'goldmine' || obj.type === 'sawmill' || obj.type === 'quarry';
    const isMineByResource = 'resource_type' in obj && ['gold', 'wood', 'stone'].includes(obj.resource_type as string);
    const hasMineKeywords = obj.type && (obj.type.includes('mine') || obj.type.includes('gold') || 
                                       obj.type.includes('wood') || obj.type.includes('stone'));
    const isAtPosition = obj.position?.x === x && obj.position?.y === y;
    
    return (isMineByType || isMineByResource || hasMineKeywords) && isAtPosition;
  }) || null;
};
