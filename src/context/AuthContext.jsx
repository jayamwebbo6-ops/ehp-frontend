import { createContext, useContext, useState, useEffect } from 'react';
import { sendOtp as apiSendOtp, verifyOtp as apiVerifyOtp, logout as apiLogout, getMe as apiGetMe } from '../services/authService';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Intercept 401 unauthorized responses to logout automatically
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          setAdmin(null);
          setIsAuthenticated(false);
        }
        return Promise.reject(error);
      }
    );
    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await apiGetMe();
        if (data && data.admin) {
          setAdmin(data.admin);
          setIsAuthenticated(true);
        }
      } catch (err) {
        // Not authenticated or session expired
        setAdmin(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const sendLoginOtp = async (email) => {
    return await apiSendOtp(email);
  };

  const verifyLoginOtp = async (email, otp) => {
    const data = await apiVerifyOtp(email, otp);
    if (data && data.admin) {
      setAdmin(data.admin);
      setIsAuthenticated(true);
    }
    return data;
  };

  const logoutUser = async () => {
    try {
      await apiLogout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setAdmin(null);
      setIsAuthenticated(false);
    }
  };

  const updateAdminDetails = (updatedFields) => {
    setAdmin(prev => prev ? { ...prev, ...updatedFields } : null);
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        isAuthenticated,
        loading,
        sendLoginOtp,
        verifyLoginOtp,
        logoutUser,
        updateAdminDetails
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
