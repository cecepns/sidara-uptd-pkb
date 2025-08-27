import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUser, isAuthenticated, logout, setUser as setUserStorage } from '../utils/auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = () => {
      const token = isAuthenticated();
      if (token) {
        const userData = getUser();
        if (userData) {
          setUser(userData);
        } else {
          // If token exists but no user data, clear token
          handleLogout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = (userData) => {
    setUser(userData);
    // Force immediate state update
    setLoading(false);
  };

  const updateUser = (userData) => {
    setUser(userData);
    setUserStorage(userData);
  };

  const handleLogout = () => {
    setUser(null);
    logout();
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    updateUser,
    logout: handleLogout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};