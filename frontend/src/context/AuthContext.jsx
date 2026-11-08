import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore, setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) return;
    api
      .getCurrentUser()
      .then((data) => setUser(data.user))
      .catch(logout)
      .finally(() => setLoading(false));
  }, [logout]);

  const value = useMemo(() => {
    async function startSession(request) {
      const data = await request;
      tokenStore.set(data.token);
      setUser(data.user);
    }
    return {
      user,
      loading,
      logout,
      login: (email, password) => startSession(api.login({ email, password })),
      register: (details) => startSession(api.register(details)),
    };
  }, [user, loading, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
