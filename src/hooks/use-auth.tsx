import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'athena_session';

export type AdminSession = { role: 'admin'; email: string; name: string };
export type ClientSession = { role: 'client'; email: string; projectId: string; projectName: string };
export type Session = AdminSession | ClientSession;

type Stored = { token: string; session: Session };

type AuthContextValue = {
  stored: Stored | null;
  loading: boolean;
  signIn: (next: Stored) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<Stored | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => setStored(raw ? JSON.parse(raw) : null))
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (next: Stored) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setStored(next);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setStored(null);
  };

  return <AuthContext.Provider value={{ stored, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
