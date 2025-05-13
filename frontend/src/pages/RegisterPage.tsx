/*
* Página de registro de usuarios
* Implementar:
* - Formulario de registro
* - Validación de campos
* - Integración con API de registro
*/

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import Button from '../components/ui/Button';
import '../styles/pages/RegisterPage.css';

interface RegisterPageProps {
  setAuth: (isAuth: boolean) => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ setAuth }) => {
  const navigate = useNavigate();
  
  // Estados
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Por favor, completa todos los campos');
      return;
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor, ingresa un email válido');
      return;
    }
    
    // Validar contraseñas
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Llamar a la API de registro
      await authService.register(username, email, password);
      
      // No actualizamos el estado de autenticación aquí
      // Ya que queremos que el usuario inicie sesión explícitamente
      
      // Redirigir a la página de login en lugar del menú
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrarse. Inténtalo de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-header">
          <h1>Heroes&Hostias</h1>
          <h2>Crear Cuenta</h2>
        </div>
        
        {error && (
          <div className="error-message">{error}</div>
        )}
        
        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="username">Nombre de Usuario</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              placeholder="Elige un nombre de usuario"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="Ingresa tu email"
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
              placeholder="Crea una contraseña"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Contraseña</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              placeholder="Repite tu contraseña"
              required
            />
          </div>
          
          <Button 
            variant="primary"
            size="large"
            disabled={loading}
            className="register-button"
          >
            {loading ? 'Registrando...' : 'Crear Cuenta'}
          </Button>
        </form>
        
        <div className="register-footer">
          <p>¿Ya tienes una cuenta? <Link to="/login">Inicia sesión</Link></p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
