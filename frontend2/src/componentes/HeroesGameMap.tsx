import { useState, useEffect } from 'react';
import { Castle, Trees, Mountain, Coins, Sword } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Tipos para nuestro juego
type TileType = 'grass' | 'forest' | 'mountain' | 'water' | 'castle' | 'resource' | 'enemy';
type Player = 'red' | 'blue';

interface Hero {
  player: Player;
  x: number;
  y: number;
  movementPoints: number;
  strength: number;
  gold: number;
}

interface Tile {
  type: TileType;
  x: number;
  y: number;
  player?: Player;
  resourceValue?: number;
}

// Estilos CSS
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#1f2937',
    minHeight: '100vh',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '16px',
  },
  gameContainer: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '16px',
  },
  mapContainer: {
    overflow: 'auto',
    padding: '8px',
    backgroundColor: '#374151',
    borderRadius: '4px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
    gap: '0',
  },
  tile: {
    width: '48px',
    height: '48px',
    position: 'relative' as const,
    cursor: 'pointer',
    border: '1px solid #1f2937',
  },
  tileGrass: {
    backgroundColor: '#bbf7d0', // green-200
  },
  tileForest: {
    backgroundColor: '#15803d', // green-700
  },
  tileMountain: {
    backgroundColor: '#9ca3af', // gray-400
  },
  tileWater: {
    backgroundColor: '#60a5fa', // blue-400
  },
  tileCastleRed: {
    backgroundColor: '#fca5a5', // red-300
  },
  tileCastleBlue: {
    backgroundColor: '#93c5fd', // blue-300
  },
  tileResource: {
    backgroundColor: '#fcd34d', // yellow-300
  },
  tileEnemy: {
    backgroundColor: '#c084fc', // purple-400
  },
  tileSelected: {
    border: '4px solid #ffffff',
  },
  iconContainer: {
    position: 'absolute' as const,
    inset: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#374151', // gray-700
  },
  heroContainer: {
    position: 'absolute' as const,
    inset: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconRed: {
    color: '#dc2626', // red-600
  },
  heroIconBlue: {
    color: '#2563eb', // blue-600
  },
  heroAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
  },
  infoPanel: {
    width: '384px',
  },
  gameInfo: {
    padding: '16px',
    backgroundColor: '#f3f4f6', // gray-100
    borderRadius: '8px',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  message: {
    marginBottom: '16px',
  },
  heroInfo: {
    marginBottom: '16px',
  },
  heroItem: {
    marginBottom: '8px',
  },
  button: {
    backgroundColor: '#3b82f6', // blue-500
    color: '#ffffff',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    border: 'none',
  },
  buttonHover: {
    backgroundColor: '#2563eb', // blue-600
  },
  instructions: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#f3f4f6', // gray-100
    borderRadius: '8px',
  },
  ul: {
    listStyleType: 'disc',
    paddingLeft: '20px',
  },
  li: {
    margin: '4px 0',
  }
};

// Componente principal del juego
export default function HeroesGameMap() {
  const mapSize = 12;
  const [map, setMap] = useState<Tile[][]>([]);
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player>('red');
  const [selectedHero, setSelectedHero] = useState<Hero | null>(null);
  const [gameMessage, setGameMessage] = useState<string>("¡Bienvenido al juego! Turno del jugador Rojo");
  const [turnCount, setTurnCount] = useState<number>(1);
  const [isHoveredButton, setIsHoveredButton] = useState<boolean>(false);

  // Inicializar el mapa al cargar
  useEffect(() => {
    initializeGame();
  }, []);

  // Función para inicializar el juego
  const initializeGame = () => {
    // Crear mapa vacío con hierba
    const newMap: Tile[][] = Array(mapSize).fill(null).map((_, y) => 
      Array(mapSize).fill(null).map((_, x) => ({
        type: 'grass',
        x,
        y
      }))
    );

    // Añadir elementos al mapa de forma aleatoria
    // Bosques
    addRandomFeatures(newMap, 'forest', 40);
    
    // Montañas
    addRandomFeatures(newMap, 'mountain', 20);
    
    // Agua
    addRandomFeatures(newMap, 'water', 15);
    
    // Recursos
    addRandomFeatures(newMap, 'resource', 12);
    
    // Enemigos
    addRandomFeatures(newMap, 'enemy', 8);

    // Añadir castillos para los jugadores
    newMap[1][1] = { type: 'castle', x: 1, y: 1, player: 'red' };
    newMap[mapSize-2][mapSize-2] = { type: 'castle', x: mapSize-2, y: mapSize-2, player: 'blue' };

    // Crear héroes para los jugadores
    const initialHeroes: Hero[] = [
      { player: 'red', x: 2, y: 1, movementPoints: 10, strength: 5, gold: 100 },
      { player: 'blue', x: mapSize-3, y: mapSize-2, movementPoints: 10, strength: 5, gold: 100 }
    ];

    setMap(newMap);
    setHeroes(initialHeroes);
  };

  // Función para añadir elementos aleatorios al mapa
  const addRandomFeatures = (mapData: Tile[][], type: TileType, count: number) => {
    for (let i = 0; i < count; i++) {
      const x = Math.floor(Math.random() * mapSize);
      const y = Math.floor(Math.random() * mapSize);
      
      // No sobrescribir castillos o elementos ya existentes
      if (mapData[y][x].type === 'grass') {
        mapData[y][x] = { 
          type, 
          x, 
          y, 
          resourceValue: type === 'resource' ? Math.floor(Math.random() * 100) + 50 : undefined 
        };
      }
    }
  };

  // Función para manejar el click en una celda
  const handleTileClick = (x: number, y: number) => {
    if (!selectedHero) {
      // Seleccionar héroe si hay uno en esa posición
      const heroAtPosition = heroes.find(hero => hero.x === x && hero.y === y && hero.player === currentPlayer);
      if (heroAtPosition) {
        setSelectedHero(heroAtPosition);
        setGameMessage(`Héroe seleccionado en posición (${x}, ${y})`);
      }
    } else {
      // Mover héroe seleccionado
      moveHero(selectedHero, x, y);
    }
  };

  // Función para mover un héroe
  const moveHero = (hero: Hero, x: number, y: number) => {
    // Calcular distancia
    const distance = Math.abs(hero.x - x) + Math.abs(hero.y - y);
    
    // Verificar si el movimiento es válido
    if (distance > hero.movementPoints) {
      setGameMessage(`¡Movimiento inválido! Distancia: ${distance}, puntos de movimiento: ${hero.movementPoints}`);
      return;
    }

    // Verificar si la celda es transitable
    const targetTile = map[y][x];
    if (targetTile.type === 'mountain' || targetTile.type === 'water') {
      setGameMessage(`¡No puedes moverte a ${targetTile.type}!`);
      return;
    }

    // Comprobar interacciones
    if (targetTile.type === 'resource') {
      collectResource(hero, targetTile);
    } else if (targetTile.type === 'enemy') {
      if (fightEnemy(hero)) {
        // Actualizar el mapa si el héroe gana
        const newMap = [...map];
        newMap[y][x] = { type: 'grass', x, y };
        setMap(newMap);
      } else {
        setGameMessage(`¡Tu héroe perdió la batalla! Se queda en su posición.`);
        setSelectedHero(null);
        return;
      }
    } else if (targetTile.type === 'castle' && targetTile.player !== hero.player) {
      // Capturar castillo enemigo
      captureCastle(hero, x, y);
    }

    // Actualizar la posición del héroe
    const newHeroes = heroes.map(h => {
      if (h === hero) {
        return { ...h, x, y, movementPoints: h.movementPoints - distance };
      }
      return h;
    });
    
    setHeroes(newHeroes);
    setSelectedHero(null);
    setGameMessage(`Héroe movido a (${x}, ${y}). Puntos de movimiento restantes: ${hero.movementPoints - distance}`);
    
    // Verificar si todos los héroes del jugador actual han agotado sus movimientos
    if (newHeroes.filter(h => h.player === currentPlayer).every(h => h.movementPoints <= 0)) {
      endTurn();
    }
  };

  // Función para recolectar recursos
  const collectResource = (hero: Hero, tile: Tile) => {
    const resourceValue = tile.resourceValue || 50;
    const newHeroes = heroes.map(h => {
      if (h === hero) {
        return { ...h, gold: h.gold + resourceValue };
      }
      return h;
    });
    
    setHeroes(newHeroes);
    setGameMessage(`¡Recurso recolectado! +${resourceValue} de oro.`);
    
    // Actualizar el mapa
    const newMap = [...map];
    newMap[tile.y][tile.x] = { type: 'grass', x: tile.x, y: tile.y };
    setMap(newMap);
  };

  // Función para combatir enemigos
  const fightEnemy = (hero: Hero): boolean => {
    // Simulación simple de combate
    const heroStrength = hero.strength;
    const enemyStrength = Math.floor(Math.random() * 10) + 1;
    
    setGameMessage(`¡Batalla! Fuerza del héroe: ${heroStrength}, Fuerza del enemigo: ${enemyStrength}`);
    
    return heroStrength >= enemyStrength;
  };

  // Función para capturar castillos
  const captureCastle = (hero: Hero, x: number, y: number) => {
    // Actualizar el castillo en el mapa
    const newMap = [...map];
    newMap[y][x] = { ...newMap[y][x], player: hero.player };
    setMap(newMap);
    
    setGameMessage(`¡Castillo capturado por el jugador ${hero.player}!`);
    
    // Verificar victoria
    const castles = newMap.flat().filter(tile => tile.type === 'castle');
    const playerCastles = castles.filter(castle => castle.player === hero.player);
    
    if (playerCastles.length === castles.length) {
      setGameMessage(`¡VICTORIA! El jugador ${hero.player} ha conquistado todos los castillos.`);
    }
  };

  // Función para finalizar el turno
  const endTurn = () => {
    const nextPlayer = currentPlayer === 'red' ? 'blue' : 'red';
    setCurrentPlayer(nextPlayer);
    
    // Restaurar puntos de movimiento para el siguiente jugador
    const newHeroes = heroes.map(hero => {
      if (hero.player === nextPlayer) {
        return { ...hero, movementPoints: 10 };
      }
      return hero;
    });
    
    setHeroes(newHeroes);
    setTurnCount(turnCount + 1);
    setGameMessage(`Turno ${turnCount + 1}: Jugador ${nextPlayer}`);
  };

  // Renderizar una celda del mapa
  const renderTile = (tile: Tile) => {
    // Encontrar si hay un héroe en esta celda
    const heroOnTile = heroes.find(hero => hero.x === tile.x && hero.y === tile.y);
    
    // Determinar el color de fondo según el tipo de terreno
    let tileStyle = { ...styles.tile };
    if (tile.type === 'grass') Object.assign(tileStyle, styles.tileGrass);
    if (tile.type === 'forest') Object.assign(tileStyle, styles.tileForest);
    if (tile.type === 'mountain') Object.assign(tileStyle, styles.tileMountain);
    if (tile.type === 'water') Object.assign(tileStyle, styles.tileWater);
    if (tile.type === 'castle') {
      if (tile.player === 'red') Object.assign(tileStyle, styles.tileCastleRed);
      else Object.assign(tileStyle, styles.tileCastleBlue);
    }
    if (tile.type === 'resource') Object.assign(tileStyle, styles.tileResource);
    if (tile.type === 'enemy') Object.assign(tileStyle, styles.tileEnemy);
    
    // Determinar si la celda está seleccionada
    const isSelected = selectedHero && selectedHero.x === tile.x && selectedHero.y === tile.y;
    if (isSelected) Object.assign(tileStyle, styles.tileSelected);
    
    // Renderizar el icono apropiado
    let icon = null;
    if (tile.type === 'castle') icon = <Castle size={24} />;
    if (tile.type === 'forest') icon = <Trees size={24} />;
    if (tile.type === 'mountain') icon = <Mountain size={24} />;
    if (tile.type === 'resource') icon = <Coins size={24} />;
    if (tile.type === 'enemy') icon = <Sword size={24} />;
    
    // Renderizar héroe si hay uno en esta celda
    let heroIcon = null;
    if (heroOnTile) {
      const heroIconStyle = heroOnTile.player === 'red' ? 
        { ...styles.heroContainer, ...styles.heroIconRed } : 
        { ...styles.heroContainer, ...styles.heroIconBlue };
      
      heroIcon = (
        <div style={heroIconStyle}>
          <div style={styles.heroAvatar}>
            H
          </div>
        </div>
      );
    }
    
    return (
      <div 
        key={`${tile.x}-${tile.y}`}
        style={tileStyle}
        onClick={() => handleTileClick(tile.x, tile.y)}
      >
        <div style={styles.iconContainer}>
          {icon}
        </div>
        {heroIcon}
      </div>
    );
  };

  // Función para mostrar la información del juego
  const renderGameInfo = () => {
    const currentHeroes = heroes.filter(hero => hero.player === currentPlayer);
    
    return (
      <div style={styles.gameInfo}>
        <h3 style={styles.sectionTitle}>
          Turno {turnCount}: Jugador {currentPlayer === 'red' ? 'Rojo' : 'Azul'}
        </h3>
        <p style={styles.message}>{gameMessage}</p>
        
        <div style={styles.heroInfo}>
          <h4 style={{ fontWeight: 'bold' }}>Héroes:</h4>
          {currentHeroes.map((hero, idx) => (
            <div key={idx} style={styles.heroItem}>
              <p>Héroe {idx + 1}: ({hero.x}, {hero.y})</p>
              <p>Movimientos: {hero.movementPoints} | Fuerza: {hero.strength} | Oro: {hero.gold}</p>
            </div>
          ))}
        </div>
        
        <button 
          style={isHoveredButton ? {...styles.button, ...styles.buttonHover} : styles.button}
          onClick={endTurn}
          onMouseEnter={() => setIsHoveredButton(true)}
          onMouseLeave={() => setIsHoveredButton(false)}
        >
          Terminar Turno
        </button>
      </div>
    );
  };

  // Renderizar instrucciones
  const renderInstructions = () => {
    return (
      <div style={styles.instructions}>
        <h3 style={styles.sectionTitle}>Instrucciones</h3>
        <ul style={styles.ul}>
          <li style={styles.li}>Haz clic en tu héroe para seleccionarlo</li>
          <li style={styles.li}>Después haz clic en una casilla para moverte</li>
          <li style={styles.li}>Recoge recursos (amarillo) para obtener oro</li>
          <li style={styles.li}>Derrota enemigos (morado) con tu fuerza</li>
          <li style={styles.li}>Captura castillos enemigos para ganar</li>
        </ul>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>
        Heroes Map Game
      </h1>
      
      <div style={styles.gameContainer}>
        <div style={styles.mapContainer}>
          <div style={styles.grid}>
            {map.flat().map(tile => renderTile(tile))}
          </div>
        </div>
        
        <div style={styles.infoPanel}>
          {renderGameInfo()}
          {renderInstructions()}
        </div>
      </div>
    </div>
  );
}