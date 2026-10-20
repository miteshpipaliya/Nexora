import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { dataService } from '../services/dataService';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  elevatedAdminVerified: boolean;
  setElevatedAdminVerified: (verified: boolean) => void;
  loginWithGoogle: () => Promise<UserProfile>;
  loginWithEmail: (email: string, pass: string) => Promise<UserProfile>;
  signupWithEmail: (data: any) => Promise<UserProfile>;
  sendVerificationEmail: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>;
  refreshUser: () => Promise<void>;
  sendEmailOtp: (email: string, purpose?: 'signup' | 'reset-password') => Promise<{
    maskedEmail: string;
    expiresInSeconds: number;
    resendCooldown: number;
  }>;
  verifyEmailOtp: (email: string, otp: string, purpose?: 'signup' | 'reset-password') => Promise<{
    verificationToken: string;
    expiresAt: number;
  }>;
  resetPasswordWithOtp: (email: string, verificationToken: string, newPassword: string) => Promise<void>;
  // Backward compatibility aliases
  login: (email: string, pass: string) => Promise<UserProfile>;
  signup: (data: any) => Promise<UserProfile>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [elevatedAdminVerified, setElevatedAdminVerified] = useState<boolean>(false);

  const refreshUser = async () => {
    try {
      const current = await dataService.getCurrentUser();
      setUser(current);
      if (current) {
        const isElevated = await dataService.checkElevatedAdminSession();
        setElevatedAdminVerified(isElevated);
      } else {
        setElevatedAdminVerified(false);
      }
    } catch (err) {
      console.error('Error fetching user in AuthProvider:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
    const unsubscribe = dataService.subscribe(() => {
      refreshUser();
    });
    return () => unsubscribe();
  }, []);

  // Periodic user presence heartbeat
  useEffect(() => {
    if (!user) return;
    dataService.sendPresenceHeartbeat();
    const interval = setInterval(() => {
      dataService.sendPresenceHeartbeat();
    }, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const u = await dataService.loginWithGoogle();
      setUser(u);
      return u;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const u = await dataService.loginWithEmail(email, pass);
      setUser(u);
      return u;
    } finally {
      setLoading(false);
    }
  };

  const signupWithEmail = async (data: any) => {
    setLoading(true);
    try {
      const u = await dataService.signupWithEmail(data);
      setUser(u);
      return u;
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationEmail = async () => {
    await dataService.sendVerificationEmail();
  };

  const sendPasswordReset = async (email: string) => {
    await dataService.sendPasswordReset(email);
  };

  const logout = async () => {
    setLoading(true);
    try {
      dataService.clearElevatedAdminSession();
      setElevatedAdminVerified(false);
      await dataService.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const updated = await dataService.updateProfile(updates);
    setUser(updated);
    return updated;
  };

  const sendEmailOtp = async (email: string, purpose: 'signup' | 'reset-password' = 'signup') => {
    return await dataService.sendEmailOtp(email, purpose);
  };

  const verifyEmailOtp = async (email: string, otp: string, purpose: 'signup' | 'reset-password' = 'signup') => {
    return await dataService.verifyEmailOtp(email, otp, purpose);
  };

  const resetPasswordWithOtp = async (email: string, token: string, newPass: string) => {
    await dataService.resetPasswordWithOtp(email, token, newPass);
  };

  const isAdmin = dataService.isUserAdmin(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        elevatedAdminVerified,
        setElevatedAdminVerified,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        sendVerificationEmail,
        sendPasswordReset,
        logout,
        updateProfile,
        refreshUser,
        sendEmailOtp,
        verifyEmailOtp,
        resetPasswordWithOtp,
        login: loginWithEmail,
        signup: signupWithEmail
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
