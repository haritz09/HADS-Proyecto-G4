import React from 'react';
import { useAudio } from '../../contexts/AudioContext';
import '../../styles/components/AudioControl.css';

interface AudioControlProps {
  variant?: 'small' | 'large';
  showLabel?: boolean;
}

const AudioControl: React.FC<AudioControlProps> = ({ 
  variant = 'small', 
  showLabel = false 
}) => {
  const { isPlaying, isMuted, togglePlay, toggleMute, volume, setVolume } = useAudio();
  
  return (
    <div className={`audio-control audio-control-${variant}`}>
      <button 
        className={`audio-btn play-btn ${isPlaying ? 'playing' : 'paused'}`}
        onClick={togglePlay}
        title={isPlaying ? 'Pausar música' : 'Reproducir música'}
      >
        {isPlaying ? '❚❚' : '▶'}
        {showLabel && <span className="btn-label">{isPlaying ? 'Pausar' : 'Reproducir'}</span>}
      </button>
      
      <button 
        className={`audio-btn mute-btn ${isMuted ? 'muted' : 'unmuted'}`}
        onClick={toggleMute}
        title={isMuted ? 'Activar sonido' : 'Silenciar'}
      >
        {isMuted ? '🔇' : '🔊'}
        {showLabel && <span className="btn-label">{isMuted ? 'Activar sonido' : 'Silenciar'}</span>}
      </button>
      
      <div className="volume-control">
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          title={`Volumen: ${Math.round(volume * 100)}%`}
        />
        {showLabel && <span className="volume-label">{Math.round(volume * 100)}%</span>}
      </div>
    </div>
  );
};

export default AudioControl;
