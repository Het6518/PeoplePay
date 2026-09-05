import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/apiServices';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await authApi.getMe();
      setCurrentUser(res.data);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (credentials) => {
    const res = await authApi.login(credentials);
    const { token, user } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setCurrentUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
  };

  const hasRole = (...roles) => currentUser && roles.includes(currentUser.role);

  const isHR = () => hasRole('HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN');
  const isPayroll = () => hasRole('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN');
  const isPayrollManager = () => hasRole('HR_PAYROLL_MANAGER', 'ADMIN');
  const isAdmin = () => hasRole('ADMIN');

  return (
    <AuthContext.Provider value={{
      currentUser,
      loading,
      login,
      logout,
      isAuthenticated: !!currentUser,
      hasRole,
      isHR,
      isPayroll,
      isPayrollManager,
      isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
