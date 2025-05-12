import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/pages/LandingPage.css';

const LandingPage: React.FC = () => {
  return (
    <div className="landing-page">
      <div className="landing-content">
        <div className="title-container">
          <h1 className="game-title">Heroes&Hostias</h1>
        </div>
        
        <div className="buttons-container">
          <Link to="/login" className="landing-button login-button">
            <span className="button-text">Iniciar Sesión</span>
          </Link>
          
          <Link to="/register" className="landing-button register-button">
            <span className="button-text">Registrarse</span>
          </Link>
        </div>
      </div>
      
      <div className="version-footer">
        <span>v1.0.0 Beta</span>
      </div>
    </div>
  );
};

export default LandingPage;
