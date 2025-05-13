/*
* Contexto para gestión de autenticación
* Implementar:
* - Estado global de autenticación
* - Funciones para login, logout, etc.
* - Persistencia de sesión
*/

import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  loading: boolean;
  login: (username: string, password: string, email: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Verificar si hay una sesión activa al cargar la aplicación
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verificar si hay un token guardado
        const token = localStorage.getItem('authToken');
        if (!token) {
          setLoading(false);
          return;
        }
        
        // Validar el token obteniendo el perfil del usuario
        const response = await authService.getProfile();
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (err) {
        // Si hay un error, limpiar el token
        localStorage.removeItem('authToken');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Función para iniciar sesión
  const login = async (username: string, password: string) => {
    const response = await authService.login(username, password);
    
    // Asegurarnos de que estamos usando la estructura correcta del objeto de respuesta
    // y actualizando el estado de usuario correctamente
    if (response.data && response.data.user) {
      setUser(response.data.user);
    } else {
      // Si la respuesta no incluye user, intentamos usar la estructura completa
      // o realizar una solicitud adicional para obtener el perfil
      const profileResponse = await authService.getProfile();
      setUser(profileResponse.data);
    }
    
    // Establecer isAuthenticated a true explícitamente
    setIsAuthenticated(true);
  };
  
  // Función para registrarse
  const register = async (username: string, email: string, password: string) => {
    const response = await authService.register(username, email, password);
    // No establecemos el estado de autenticación después del registro
    // Para obligar al usuario a iniciar sesión explícitamente
    return response.data;
  };
  
  // Función para cerrar sesión
  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };
  
  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    register,
    logout,
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
