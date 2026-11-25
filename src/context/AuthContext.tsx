import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, AUTH_EXPIRED_EVENT, hasAdminHint, setAdminHint } from '../lib/api';
import { errorText } from '../lib/content';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  /** Revokes every admin session on every device (this one included). */
  logoutAll: () => Promise<{ success: boolean; revoked?: number; error?: string }>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: () => {},
  logoutAll: async () => ({ success: false })
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Any admin request that comes back 401 (expired, revoked or rotated session) signs the UI out.
    const onExpired = () => {
      setAdminHint(false);
      setIsAuthenticated(false);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  useEffect(() => {
    const check = async () => {
      // Visitors who never signed in skip the check; the admin area always verifies the cookie.
      if (!hasAdminHint() && !window.location.pathname.startsWith('/admin')) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      try {
        const res = await api.checkAuth();
        setIsAuthenticated(!!res.authenticated);
        setAdminHint(!!res.authenticated);
      } catch (e) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    check();
  }, []);

  const login = async (password: string) => {
    try {
      const res = await api.login(password);
      if (res.success) {
        setAdminHint(true);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, error: res.error || 'Authentication failed' };
    } catch (e) {
      return { success: false, error: errorText(e) || 'Login error' };
    }
  };

  const logout = () => {
    api.logout();
    setAdminHint(false);
    setIsAuthenticated(false);
  };

  const logoutAll = async () => {
    try {
      const res = await api.logoutAllSessions();
      setAdminHint(false);
      setIsAuthenticated(false);
      return { success: true, revoked: res.sessionsRevoked };
    } catch (e) {
      // The current session stays signed in when the request fails (nothing was revoked).
      return { success: false, error: errorText(e) || 'Could not sign out other devices.' };
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout, logoutAll }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
