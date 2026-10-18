import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [context, setContext] = useState(null); // plan, wallet, subscription
  const [wallet, setWallet] = useState({ subscriptionBalance: 0, purchasedBalance: 0, totalBalance: 0 });
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    const token = localStorage.getItem('modelar_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await api.me();
      setUser(data.user);
      setBusiness(data.business);
      setContext(data.context);

      // Also fetch live wallet
      if (data.business) {
        const walData = await api.getWallet().catch(() => null);
        if (walData?.wallet) {
          setWallet(walData.wallet);
        }
      }
    } catch (err) {
      console.warn('[Auth Profile Fetch Error]:', err);
      localStorage.removeItem('modelar_token');
      setUser(null);
      setBusiness(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    localStorage.setItem('modelar_token', data.token);
    setUser(data.user);
    setBusiness(data.business);
    await fetchProfile();
    return data;
  };

  const register = async (payload) => {
    const data = await api.register(payload);
    localStorage.setItem('modelar_token', data.token);
    setUser(data.user);
    setBusiness(data.business);
    await fetchProfile();
    return data;
  };

  const logout = () => {
    localStorage.removeItem('modelar_token');
    setUser(null);
    setBusiness(null);
    setContext(null);
    setWallet({ subscriptionBalance: 0, purchasedBalance: 0, totalBalance: 0 });
  };

  const refreshContext = async () => {
    await fetchProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        context,
        wallet,
        loading,
        login,
        register,
        logout,
        refreshContext
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
