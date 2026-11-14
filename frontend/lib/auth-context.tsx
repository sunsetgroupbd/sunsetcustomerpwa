'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from './types';
import { api, getStoredUser, getStoredTokens, setStoredTokens, setStoredUser, clearStoredTokens } from './api';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phoneNumber: string, password?: string) => Promise<User>;
  register: (data: { phone_number: string; full_name: string; password?: string; email?: string }) => Promise<User>;
  verifyOtp: (phoneNumber: string, otpCode: string) => Promise<User>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = async () => {
    try {
      const stored = getStoredUser();
      const { accessToken } = getStoredTokens();

      if (accessToken && stored) {
        setUser(stored);
        // Silently fetch freshest profile
        try {
          const fresh = await api.auth.me();
          if (fresh) {
            setUser(fresh);
            setStoredUser(fresh);
          }
        } catch (e) {
          // If token expired, getStoredTokens or request interceptor handles it
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (phoneNumber: string, password?: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res: any = await api.auth.login(phoneNumber, password);
      const accessToken = res.access_token || res.tokens?.access_token || res.data?.access_token;
      const refreshToken = res.refresh_token || res.tokens?.refresh_token || res.data?.refresh_token || '';

      if (!accessToken) {
        throw new Error('Authentication succeeded but no access token was returned.');
      }
      setStoredTokens(accessToken, refreshToken);

      let authUser = res.user || res.data?.user;
      if (!authUser) {
        try {
          authUser = await api.auth.me();
        } catch {
          authUser = {
            id: '1',
            phone_number: phoneNumber,
            email: null,
            full_name: phoneNumber,
            role: 'customer',
            is_active: true,
            is_verified: true,
            business_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
      }
      setStoredUser(authUser);
      setUser(authUser);
      return authUser;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: { phone_number: string; full_name: string; password?: string; email?: string }): Promise<User> => {
    setIsLoading(true);
    try {
      const res: any = await api.auth.register(data);
      const accessToken = res.access_token || res.tokens?.access_token || res.data?.access_token;
      const refreshToken = res.refresh_token || res.tokens?.refresh_token || res.data?.refresh_token || '';

      if (accessToken) {
        setStoredTokens(accessToken, refreshToken);
      }

      let authUser = res.user || res.data?.user;
      if (!authUser && accessToken) {
        try {
          authUser = await api.auth.me();
        } catch {
          // fallback
        }
      }
      if (!authUser) {
        authUser = {
          id: String(res.id || res.data?.id || 'new'),
          phone_number: data.phone_number,
          email: data.email || null,
          full_name: data.full_name,
          role: 'customer',
          is_active: true,
          is_verified: false,
          business_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      setStoredUser(authUser);
      setUser(authUser);
      return authUser;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (phoneNumber: string, otpCode: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res: any = await api.auth.verifyOtp(phoneNumber, otpCode);
      const accessToken = res.access_token || res.tokens?.access_token || res.data?.access_token;
      const refreshToken = res.refresh_token || res.tokens?.refresh_token || res.data?.refresh_token || '';

      if (accessToken) {
        setStoredTokens(accessToken, refreshToken);
      }

      let authUser = res.user || res.data?.user;
      if (!authUser && accessToken) {
        try {
          authUser = await api.auth.me();
        } catch {
          // fallback
        }
      }
      if (!authUser) {
        authUser = {
          id: '1',
          phone_number: phoneNumber,
          email: null,
          full_name: phoneNumber,
          role: 'customer',
          is_active: true,
          is_verified: true,
          business_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      setStoredUser(authUser);
      setUser(authUser);
      return authUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearStoredTokens();
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const refreshProfile = async () => {
    try {
      const fresh = await api.auth.me();
      if (fresh) {
        setUser(fresh);
        setStoredUser(fresh);
      }
    } catch {
      // Ignored
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        verifyOtp,
        logout,
        refreshProfile,
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

