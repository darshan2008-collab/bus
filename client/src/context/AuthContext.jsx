import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('bus_auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('bus_auth_token'));
  const [loading, setLoading] = useState(true);
  const [selectedBusId, setSelectedBusId] = useState(() => {
    const saved = localStorage.getItem('bus_selected_bus');
    return saved ? parseInt(saved, 10) : 1;
  });

  const [activeSession, setActiveSession] = useState(() => {
    const saved = localStorage.getItem('bus_active_session');
    if (saved) return saved;
    return new Date().getHours() < 12 ? 'MORNING' : 'EVENING';
  });

  const toggleSession = (targetSession) => {
    const nextSession = targetSession || (activeSession === 'MORNING' ? 'EVENING' : 'MORNING');
    setActiveSession(nextSession);
    localStorage.setItem('bus_active_session', nextSession);
  };

  useEffect(() => {
    apiRequest('/buses')
      .then((res) => {
        if (res && res.buses && res.buses.length > 0) {
          const busExists = res.buses.some((b) => b.id === selectedBusId);
          if (!busExists) {
            setSelectedBusId(res.buses[0].id);
            localStorage.setItem('bus_selected_bus', String(res.buses[0].id));
          }
        }
      })
      .catch(() => {});

    if (token) {
      apiRequest('/auth/me')
        .then((res) => {
          setUser(res.user);
          localStorage.setItem('bus_auth_user', JSON.stringify(res.user));
          if (res.user.assigned_bus_id) {
            setSelectedBusId(res.user.assigned_bus_id);
            localStorage.setItem('bus_selected_bus', String(res.user.assigned_bus_id));
          }
        })
        .catch(() => {
          setUser(null);
          setToken(null);
          localStorage.removeItem('bus_auth_token');
          localStorage.removeItem('bus_auth_user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    const handleExpired = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener('auth-expired', handleExpired);
    return () => window.removeEventListener('auth-expired', handleExpired);
  }, [token]);

  const login = async (userId, password) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, password })
    });
    localStorage.setItem('bus_auth_token', res.token);
    localStorage.setItem('bus_auth_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    if (res.user.assigned_bus_id) {
      setSelectedBusId(res.user.assigned_bus_id);
      localStorage.setItem('bus_selected_bus', String(res.user.assigned_bus_id));
    }
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('bus_auth_token');
    localStorage.removeItem('bus_auth_user');
    setToken(null);
    setUser(null);
  };

  const changeBus = (busId) => {
    const id = parseInt(busId, 10);
    setSelectedBusId(id);
    localStorage.setItem('bus_selected_bus', String(id));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        selectedBusId,
        changeBus,
        activeSession,
        setActiveSession,
        toggleSession,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        isStudentCoord: user?.role === 'STUDENT_COORDINATOR',
        isStopCoord: user?.role === 'STOP_COORDINATOR',
        isFaculty: user?.role === 'FACULTY'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
