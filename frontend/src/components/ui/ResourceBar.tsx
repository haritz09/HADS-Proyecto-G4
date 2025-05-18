import React, { useEffect, useState } from 'react';
import '../../styles/components/ResourceBar.css';

interface ResourceBarProps {
  resources: {
    gold: number;
    wood: number;
    stone: number;
  };
}

const ResourceBar: React.FC<ResourceBarProps> = ({ resources }) => {
  // Use state to track resource changes for animation
  const [animatedResources, setAnimatedResources] = useState(resources);
  const [highlighting, setHighlighting] = useState({
    gold: false,
    wood: false,
    stone: false
  });

  // Update animated resources when actual resources change
  useEffect(() => {
    // Check which resources have changed
    const changed = {
      gold: resources.gold !== animatedResources.gold,
      wood: resources.wood !== animatedResources.wood,
      stone: resources.stone !== animatedResources.stone
    };
    
    // Set highlighting effect for changed resources
    if (changed.gold || changed.wood || changed.stone) {
      console.log("ResourceBar: Resources changed", {
        previous: animatedResources,
        new: resources,
        decreased: {
          gold: changed.gold && resources.gold < animatedResources.gold,
          wood: changed.wood && resources.wood < animatedResources.wood,
          stone: changed.stone && resources.stone < animatedResources.stone
        }
      });

      setHighlighting({
        gold: changed.gold && resources.gold < animatedResources.gold,
        wood: changed.wood && resources.wood < animatedResources.wood,
        stone: changed.stone && resources.stone < animatedResources.stone
      });
      
      // Update values
      setAnimatedResources(resources);
      
      // Remove highlighting after animation
      setTimeout(() => {
        setHighlighting({
          gold: false,
          wood: false,
          stone: false
        });
      }, 1000);
    }
  }, [resources]);

  return (
    <div className="resource-bar">
      <div className={`resource gold ${highlighting.gold ? 'highlight-decrease' : ''}`}>
        <span className="resource-icon">💰</span>
        <span className="resource-value">{resources.gold}</span>
      </div>
      
      <div className={`resource wood ${highlighting.wood ? 'highlight-decrease' : ''}`}>
        <span className="resource-icon">🪵</span>
        <span className="resource-value">{resources.wood}</span>
      </div>
      
      <div className={`resource stone ${highlighting.stone ? 'highlight-decrease' : ''}`}>
        <span className="resource-icon">🪨</span>
        <span className="resource-value">{resources.stone}</span>
      </div>
    </div>
  );
};

export default ResourceBar;
