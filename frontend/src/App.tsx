/*
* Componente principal de la aplicación
* Implementa:
* - Estructura general de la aplicación
* - Rutas principales
* - Gestión de autenticación a nivel global
*/

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import WelcomeScreen from './components/WelcomeScreen';
import { useAuth } from './contexts/AuthContext';
import { AudioProvider } from './contexts/AudioContext';
import AudioPlayer from './components/ui/AudioPlayer';
import AudioControl from './components/ui/AudioControl';  // Add this import
import './styles/App.css';

// Importar páginas principales
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MainMenuPage from './pages/MainMenuPage';
import GamePage from './pages/GamePage';
import CityPage from './pages/CityPage';
import HeroPage from './pages/HeroPage';

const App: React.FC = () => {
  const { isAuthenticated, loading, login, register } = useAuth();
  
  // Create adapter functions to match the expected prop types
  const handleLogin = () => {
    // This is a simple adapter that ignores the boolean and delegates actual auth to the context
    return true; // Return true to satisfy the expected boolean return
  };
  
  const handleRegister = () => {
    // This is a simple adapter that ignores the boolean and delegates actual auth to the context
    return true; // Return true to satisfy the expected boolean return
  };
  
  if (loading) {
    return <div className="loading-screen">Cargando...</div>;
  }

  return (
    <AudioProvider>
      <AudioPlayer />
      
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        
        <Route path="/login" element={<LoginPage setAuth={handleLogin} />} />
        <Route path="/register" element={<RegisterPage setAuth={handleRegister} />} />
        
        {/* Protected routes - only accessible when authenticated */}
        <Route 
          path="/menu" 
          element={isAuthenticated ? <MainMenuPage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/game" 
          element={isAuthenticated ? <GamePage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/city" 
          element={isAuthenticated ? <CityPage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/hero" 
          element={isAuthenticated ? <HeroPage /> : <Navigate to="/login" />} 
        />
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      
      <div className="audio-control-container">
        <AudioControl variant="small" />
      </div>
    </AudioProvider>
  );
};

export default App;