import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <h1>Welcome to Our Website</h1>
      <p>Discover amazing content and connect with others.</p>
      <Link to="/signup" className="btn">Sign Up</Link>
      <Link to="/login" className="btn">Log In</Link>
    </div>
  );
};

export default LandingPage;

// Agregar exportación vacía para hacer que sea un módulo
export {};