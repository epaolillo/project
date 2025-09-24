import React, { useState } from 'react';
import './Login.css';

/**
 * Login component with username/password authentication
 * Handles JWT token storage in cookies upon successful login
 */
const Login = ({ onLogin, isLoading = false, error = null }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!formData.username.trim()) {
      errors.username = 'El nombre de usuario es requerido';
    } else if (formData.username.length < 3) {
      errors.username = 'El nombre de usuario debe tener al menos 3 caracteres';
    }

    if (!formData.password.trim()) {
      errors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    return errors;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setValidationErrors({});

    try {
      await onLogin(formData);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle key press for form submission
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isSubmitting && !isLoading) {
      handleSubmit(e);
    }
  };

  // Demo credentials helper
  const fillDemoCredentials = (userType = 'admin') => {
    if (userType === 'admin') {
      setFormData({
        username: 'admin',
        password: 'admin123'
      });
    } else if (userType === 'user') {
      setFormData({
        username: 'alejandro',
        password: 'password123'
      });
    }
    setValidationErrors({});
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-card">
          {/* Header */}
          <div className="login-header">
            <div className="login-logo">
              <div className="logo-icon">
                📊
              </div>
            </div>
            <h1 className="login-title">Task Manager</h1>
            <p className="login-subtitle">
              Sistema de gestión de tareas y seguimiento
            </p>
          </div>

          {/* Form */}
          <form className="login-form" onSubmit={handleSubmit}>
            {/* Username Field */}
            <div className="form-group">
              <label htmlFor="username" className="form-label">
                Usuario
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                className={`form-input ${validationErrors.username ? 'error' : ''}`}
                placeholder="Ingresa tu usuario"
                disabled={isSubmitting || isLoading}
                autoComplete="username"
                autoFocus
              />
              {validationErrors.username && (
                <span className="field-error">{validationErrors.username}</span>
              )}
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                className={`form-input ${validationErrors.password ? 'error' : ''}`}
                placeholder="Ingresa tu contraseña"
                disabled={isSubmitting || isLoading}
                autoComplete="current-password"
              />
              {validationErrors.password && (
                <span className="field-error">{validationErrors.password}</span>
              )}
            </div>

            {/* Global Error */}
            {error && (
              <div className="login-error">
                <span className="error-icon">⚠️</span>
                <span className="error-text">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="login-button"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting || isLoading ? (
                <>
                  <span className="loading-spinner"></span>
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="demo-section">
            <p className="demo-title">Credenciales de prueba:</p>
            <div className="demo-buttons">
              <button
                type="button"
                className="demo-button"
                onClick={() => fillDemoCredentials('admin')}
                disabled={isSubmitting || isLoading}
              >
                👨‍💼 Administrador
              </button>
              <button
                type="button"
                className="demo-button"
                onClick={() => fillDemoCredentials('user')}
                disabled={isSubmitting || isLoading}
              >
                👨‍💻 Usuario
              </button>
            </div>
            <div className="demo-info">
              <p>
                <strong>Admin:</strong> admin / admin123<br />
                <strong>Usuario:</strong> alejandro / password123
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="login-footer">
            <p className="footer-text">
              Sistema de gestión gamificada de tareas
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
