/*
* Página de inicio de sesión
* Implementar:
* - Formulario de login
* - Validación de campos
* - Integración con API de autenticación
*/

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import Button from '../components/ui/Button';
import '../styles/pages/LoginPage.css';

interface LoginPageProps {
  setAuth: (isAuth: boolean) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ setAuth }) => {
  const navigate = useNavigate();
  
  // Estados
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos
    if (!email.trim() || !username.trim() || !password.trim()) {
      setError('Por favor, completa todos los campos');
      return;
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor, ingresa un email válido');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Llamar a la API de login (ahora solo con username y password)
      await authService.login(username, password);
      
      // Actualizar estado de autenticación
      setAuth(true);
      
      // Redirigir a la página principal (MainMenuPage)
      navigate('/menu');
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>Heroes&Hostias</h1>
          <h2>Iniciar Sesión</h2>
        </div>
        
        {error && (
          <div className="error-message">{error}</div>
        )}
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="Ingresa tu correo electrónico"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="username">Nombre de Usuario</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              placeholder="Ingresa tu nombre de usuario"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="Ingresa tu contraseña"
              required
            />
          </div>
          
          <Button 
            variant="primary"
            size="large"
            disabled={loading}
            className="login-button"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </Button>
        </form>
        
        <div className="login-footer">
          <p>¿No tienes una cuenta? <Link to="/register">Regístrate</Link></p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
