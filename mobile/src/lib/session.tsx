import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from './supabase';

type AuthState = {
  /** null when signed out. */
  session: Session | null;
  /** true until we've checked the phone for a saved login. */
  loading: boolean;
  /** true while the user is resetting their password (temporary recovery session). */
  recovering: boolean;
  setRecovering: (v: boolean) => void;
};

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  recovering: false,
  setRecovering: () => undefined,
});

/**
 * Makes the current login available to every screen (like a request-wide `current_user`).
 * Wrap the app in <AuthProvider>, then call useAuth() in any screen.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(supabase !== null);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, recovering, setRecovering }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
