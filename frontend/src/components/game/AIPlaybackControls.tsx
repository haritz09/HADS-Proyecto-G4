import React from 'react';
import '../../styles/components/AIPlaybackControls.css';

interface AIPlaybackControlsProps {
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  onSkip: () => void;
  isVisible: boolean;
}

/**
 * Componente que proporciona controles para ajustar la velocidad de reproducción 
 * de las acciones de la IA o saltarlas completamente
 */
const AIPlaybackControls: React.FC<AIPlaybackControlsProps> = ({
  playbackSpeed,
  onSpeedChange,
  onSkip,
  isVisible
}) => {
  if (!isVisible) return null;

  const speedOptions = [
    { value: 0.5, label: '0.5x' },
    { value: 1.0, label: '1x' },
    { value: 1.5, label: '1.5x' },
    { value: 2.0, label: '2x' },
    { value: 3.0, label: '3x' }
  ];

  return (
    <div className="ai-playback-controls">
      <div className="playback-speed-controls">
        <span className="controls-label">Velocidad:</span>
        <div className="speed-buttons">
          {speedOptions.map(option => (
            <button
              key={option.value}
              className={`speed-button ${playbackSpeed === option.value ? 'active' : ''}`}
              onClick={() => onSpeedChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      
      <button className="skip-button" onClick={onSkip}>
        Saltar <span className="skip-icon">⏭️</span>
      </button>
    </div>
  );
};

export default AIPlaybackControls;
