import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Business } from '@/lib/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  business: Business | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshBusiness: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBusiness = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.error('Error fetching business:', error);
      return;
    }
    setBusiness(data as Business | null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        fetchBusiness(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        fetchBusiness(newSession.user.id).finally(() => setLoading(false));
      } else {
        setBusiness(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [fetchBusiness]);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setBusiness(null);
  };

  const refreshBusiness = async () => {
    if (user) await fetchBusiness(user.id);
  };

  return (
    <AuthContext.Provider
      value={{ session, user, business, loading, signUp, signIn, signOut, refreshBusiness }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
