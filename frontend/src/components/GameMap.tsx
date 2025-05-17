import React, { useEffect, useState } from 'react';

interface ActionResult {
  close_construction_menu?: boolean;
  // ...otros campos que pueda tener actionResult
}

interface GameMapProps {
  // Añade aquí las props que necesite tu componente
}

const GameMap: React.FC<GameMapProps> = () => {
  const [showBuildingMenu, setShowBuildingMenu] = useState<boolean>(false);
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);

  useEffect(() => {
    if (actionResult?.close_construction_menu) {
      setShowBuildingMenu(false);
    }
  }, [actionResult]);

  return (
    <div className="game-map">
      {/* ... tu JSX existente ... */}
    </div>
  );
};

export default GameMap;
