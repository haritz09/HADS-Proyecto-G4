import React, { useState } from 'react';

const BuildingConstructionMenu = ({ onClick }) => {
  const [selectedPosition, setSelectedPosition] = useState(null);

  const handleBuildingSelection = (buildingType) => {
    try {
      // Make sure we pass valid parameters
      if (selectedPosition && buildingType) {
        onClick(buildingType, selectedPosition);
      } else {
        console.error("Missing building data or position");
      }
    } catch (error) {
      console.error("Error selecting building:", error);
    }
  };

  return (
    <div>
      <h3>Select a building to construct:</h3>
      <button onClick={() => handleBuildingSelection('House')}>House</button>
      <button onClick={() => handleBuildingSelection('Farm')}>Farm</button>
      <button onClick={() => handleBuildingSelection('Barracks')}>Barracks</button>
    </div>
  );
};

export default BuildingConstructionMenu;