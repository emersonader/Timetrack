import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getDatabase } from '../db/database';

interface AuthUser {
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  signIn: (email: string) => Promise<void>;
  signOut: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Ensure the user_auth table exists in the database
 */
async function ensureAuthTable(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_auth (
      email TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        await ensureAuthTable();
        const db = await getDatabase();
        const row = await db.getFirstAsync<{ email: string }>(
          'SELECT email FROM user_auth LIMIT 1'
        );
        if (row) {
          setUser({ email: row.email });
        }
      } catch (error) {
        console.error('Failed to load auth user:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const signIn = useCallback(async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      throw new Error('Email is required');
    }
    try {
      await ensureAuthTable();
      const db = await getDatabase();
      // Clear any existing user
      await db.runAsync('DELETE FROM user_auth');
      // Insert new user
      await db.runAsync(
        'INSERT INTO user_auth (email, created_at) VALUES (?, ?)',
        [trimmed, new Date().toISOString()]
      );
      setUser({ email: trimmed });
    } catch (error) {
      console.error('Failed to sign in:', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await ensureAuthTable();
      const db = await getDatabase();
      await db.runAsync('DELETE FROM user_auth');
      setUser(null);
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  }, []);

  const value: AuthContextType = {
    user,
    signIn,
    signOut,
    isAuthenticated: user !== null,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
