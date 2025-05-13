import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import HeroesMenu from './componentes/HeroesMenu';
import HeroesMapa from './componentes/HeroesGameMap'; // Importa tu componente de mapa

import LoginForm from './componentes/Login';
import RegisterForm from './componentes/Register';
import HeroesGameMap from './componentes/HeroesGameMap';


const App: React.FC = () => {
  const [user, setUser] = useState<string | null>(null);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={user ? <Navigate to="/heroes" /> : <Auth setUser={setUser} />}
        />
        <Route
          path="/heroes"
          element={user ? <HeroesMenu /> : <Navigate to="/" />}
        />
        <Route
          path="/heroesMap"
          element={user ? <HeroesGameMap /> : <Navigate to="/" />}
        />
      </Routes>
    </Router>
  );
};

// Componente que maneja Login/Register
const Auth: React.FC<{ setUser: (email: string) => void }> = ({ setUser }) => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const handleLogin = (email: string) => {
    setUser(email);
    navigate('/heroes');
  };

  const handleRegister = (email: string) => {
    setUser(email);
    navigate('/heroes');
  };

  return (
    <div>
      {isLogin ? (
        <LoginForm onLogin={handleLogin} />
      ) : (
        <RegisterForm onRegister={handleRegister} />
      )}
      <div className="text-center mt-4">
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-blue-500 hover:underline"
        >
          {isLogin ? 'No account? Register here' : 'Have an account? Login here'}
        </button>
      </div>
    </div>
  );
};

export default App;
