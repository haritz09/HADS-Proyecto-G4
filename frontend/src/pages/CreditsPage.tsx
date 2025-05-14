import React from 'react';
import { useNavigate } from 'react-router-dom';
import CreditsMap from '../components/credits/CreditsMap';
import Button from '../components/ui/Button';
import '../styles/pages/CreditsPage.css';

const CreditsPage: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="credits-page">
      <div className="credits-header">
        <h1>Créditos</h1>
        <Button 
          variant="secondary" 
          onClick={() => navigate('/menu')}
        >
          Volver al Menú
        </Button>
      </div>
      
      <div className="credits-content">
        <div className="credits-info">
          <h2>Heroes&Hostias</h2>
          <p>Desarrollado como proyecto educativo</p>
          
          <div className="team-section">
            <h3>Equipo de Desarrollo</h3>
            <ul>
              <li>Grupo 4</li>
              <li>Universidad Europea</li>
              <li>2023-2024</li>
            </ul>
          </div>
          
          <div className="tech-section">
            <h3>Tecnologías</h3>
            <ul>
              <li>React</li>
              <li>TypeScript</li>
              <li>Node.js</li>
              <li>MongoDB</li>
            </ul>
          </div>
        </div>
        
        <div className="map-section">
          <h3>Explorador de Mapa</h3>
          <p>Muestra del terreno generado para el juego</p>
          <CreditsMap width={100} height={100} />
        </div>
      </div>
    </div>
  );
};

export default CreditsPage;
