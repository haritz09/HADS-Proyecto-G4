import React from 'react';
import { useNavigate } from 'react-router-dom';
import WorldMap from '../components/map/WorldMap';
import '../styles/pages/MapPage.css';

const MapPage: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="map-page">
      <div className="map-header">
        <h1>Mapa del Mundo</h1>
        <button 
          className="back-button" 
          onClick={() => navigate('/menu')}
        >
          Volver al Menú
        </button>
      </div>
      <WorldMap width={100} height={100} />
    </div>
  );
};

export default MapPage;
