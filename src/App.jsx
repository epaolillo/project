import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layouts/Layout';
import Login from './components/Login/Login';
import apiService from './services/ApiService';
import './App.css';

/**
 * Main App component with authentication and routing
 */
function App() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState(null);

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();

    // Listen for authentication failures
    const handleAuthFailure = () => {
      setIsAuthenticated(false);
      setUser(null);
      setLoginError('Sesión expirada. Por favor inicia sesión nuevamente.');
    };

    window.addEventListener('authenticationFailed', handleAuthFailure);
    
    return () => {
      window.removeEventListener('authenticationFailed', handleAuthFailure);
    };
  }, []);

  const checkAuthStatus = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.checkAuthStatus();
      if (response.authenticated) {
        setUser(response.user);
        setIsAuthenticated(true);
        
        // Store user info in localStorage for quick access
        localStorage.setItem('user', JSON.stringify(response.user));
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (credentials) => {
    setLoginError(null);
    try {
      const response = await apiService.login(credentials);
      
      if (response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        
        // Store user info in localStorage
        localStorage.setItem('user', JSON.stringify(response.user));
        
        console.log('Login successful:', response.message);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Login failed:', error);
      setLoginError(error.message || 'Error al iniciar sesión. Verifica tus credenciales.');
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.warn('Logout error:', error);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem('user');
    }
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="App">
        <div className="app-loading">
          <div className="loading-spinner-large"></div>
          <p>Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="App">
        <Login 
          onLogin={handleLogin}
          error={loginError}
        />
      </div>
    );
  }

  // Show main app if authenticated
  return (
    <div className="App">
      <Layout user={user} onLogout={handleLogout} />
    </div>
  );
}

export default App;
