'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserSession {
  email: string;
  role: 'USER' | 'ADMIN';
  accessToken: string;
  refreshToken: string;
  virtualBalance: number;
  initialBalance: number;
}

export type OtpChannel = 'EMAIL' | 'SMS';

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  loading: boolean;

  /**
   * Step 1 of login: verify password and dispatch a dynamic OTP to the user's
   * registered email (default) or mobile number.
   * Returns the user's email so the caller can pre-fill the OTP screen.
   */
  initiateLogin: (
    email: string,
    password: string,
    channel?: OtpChannel
  ) => Promise<{ email: string; channel: OtpChannel }>;

  /**
   * Step 2 of login: submit the 6-digit OTP code received via email/SMS.
   * On success the JWT session is established.
   */
  verifyOtp: (email: string, code: string) => Promise<void>;

  /**
   * Register a new account (email + password + phone + optional starting balance).
   * No QR code / TOTP — login OTP will be used for MFA.
   */
  register: (
    email: string,
    password: string,
    phoneNumber: string,
    startingBalance?: number
  ) => Promise<void>;

  /**
   * Request a password-reset OTP via email or SMS.
   */
  forgotPassword: (email: string, channel: OtpChannel) => Promise<void>;

  /**
   * Submit the reset OTP and set a new password.
   */
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;

  /**
   * Log in via Firebase ID token (obtained from Firebase client SDK on the frontend).
   * Useful for social sign-in (Google, GitHub, etc.) via Firebase.
   */
  firebaseLogin: (idToken: string) => Promise<void>;

  logout: () => void;
  updateBalance: (newBalance: number) => void;
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<Response>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const saved = localStorage.getItem('crypto_trader_session');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem('crypto_trader_session');
      }
    }
    setLoading(false);
  }, []);

  // ── Registration ────────────────────────────────────────────────────────────

  const register = async (
    email: string,
    password: string,
    phoneNumber: string,
    startingBalance?: number
  ): Promise<void> => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        phoneNumber,
        startingBalance: startingBalance ?? null,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Registration failed!');
    }
    // Registration successful — user must now log in
  };

  // ── Login — Step 1: Dispatch dynamic OTP ───────────────────────────────────

  const initiateLogin = async (
    email: string,
    password: string,
    channel: OtpChannel = 'EMAIL'
  ): Promise<{ email: string; channel: OtpChannel }> => {
    const endpoint =
      channel === 'SMS'
        ? '/api/auth/login/request-sms-otp'
        : '/api/auth/login/request-otp';

    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Invalid credentials or connection error!');
    }

    const data = await res.json();
    return { email: data.email || email, channel };
  };

  // ── Login — Step 2: Verify OTP, receive JWT ────────────────────────────────

  const verifyOtp = async (email: string, code: string): Promise<void> => {
    const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Invalid OTP code! Please try again.');
    }

    const data: UserSession = await res.json();
    setUser(data);
    localStorage.setItem('crypto_trader_session', JSON.stringify(data));
  };

  // ── Firebase Login ─────────────────────────────────────────────────────────

  const firebaseLogin = async (idToken: string): Promise<void> => {
    const res = await fetch(`${API_URL}/api/auth/firebase/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Firebase authentication failed!');
    }

    const data: UserSession = await res.json();
    setUser(data);
    localStorage.setItem('crypto_trader_session', JSON.stringify(data));
  };

  // ── Forgot / Reset Password ────────────────────────────────────────────────

  const forgotPassword = async (email: string, channel: OtpChannel): Promise<void> => {
    const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, channel }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to request reset OTP!');
    }
  };

  const resetPassword = async (
    email: string,
    code: string,
    newPassword: string
  ): Promise<void> => {
    const res = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, newPassword }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to reset password!');
    }
  };

  // ── Session Management ─────────────────────────────────────────────────────

  const logout = () => {
    setUser(null);
    localStorage.removeItem('crypto_trader_session');
  };

  const updateBalance = (newBalance: number) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, virtualBalance: newBalance };
      localStorage.setItem('crypto_trader_session', JSON.stringify(updated));
      return updated;
    });
  };

  // ── Authenticated API Fetch (with auto token rotation) ────────────────────

  const apiFetch = async (
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    let currentSession = user;
    if (!currentSession) {
      const saved = localStorage.getItem('crypto_trader_session');
      if (saved) currentSession = JSON.parse(saved);
    }

    const headers = new Headers(options.headers || {});
    if (currentSession?.accessToken) {
      headers.set('Authorization', `Bearer ${currentSession.accessToken}`);
    }
    headers.set('Content-Type', 'application/json');

    let response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

    // Auto-rotate refresh token on 401
    if (response.status === 401 && currentSession?.refreshToken) {
      console.log('[Auth] Access token expired — attempting refresh rotation…');
      try {
        const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: currentSession.refreshToken }),
        });

        if (refreshRes.ok) {
          const fresh: UserSession = await refreshRes.json();
          setUser(fresh);
          localStorage.setItem('crypto_trader_session', JSON.stringify(fresh));

          const retryHeaders = new Headers(options.headers || {});
          retryHeaders.set('Authorization', `Bearer ${fresh.accessToken}`);
          retryHeaders.set('Content-Type', 'application/json');
          response = await fetch(`${API_URL}${endpoint}`, { ...options, headers: retryHeaders });
        } else {
          console.warn('[Auth] Refresh token expired — logging out.');
          logout();
        }
      } catch (err) {
        console.error('[Auth] Token refresh failed:', err);
        logout();
      }
    }

    return response;
  };

  // ── Context Value ──────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        initiateLogin,
        verifyOtp,
        register,
        forgotPassword,
        resetPassword,
        firebaseLogin,
        logout,
        updateBalance,
        apiFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ── Hook ───────────────────────────────────────────────────────────────────────

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
