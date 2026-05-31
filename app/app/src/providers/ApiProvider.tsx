import { createContext, useContext, useCallback, useMemo, useState, useEffect, type ReactNode } from "react";
import { api, ApiError, getToken, setToken, clearToken, getOrgId, setOrgId, clearOrgId } from "@/lib/api";

type User = { id: number; email: string; name: string };

interface ApiContextValue {
  api: typeof api;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  orgId: number | null;
  setOrg: (id: number) => void;
}

const ApiContext = createContext<ApiContextValue | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orgId, setOrgIdState] = useState<number | null>(getOrgId);

  const fetchUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const u = await api.auth.me();
      setUser(u);
    } catch {
      clearToken();
      clearOrgId();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.auth.login(email, password);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const result = await api.auth.register(email, password, name);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    clearOrgId();
    setUser(null);
    setOrgIdState(null);
  }, []);

  const setOrg = useCallback((id: number) => {
    setOrgId(id);
    setOrgIdState(id);
  }, []);

  const value = useMemo(() => ({
    api,
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    orgId,
    setOrg,
  }), [user, isLoading, login, register, logout, orgId, setOrg]);

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApi() {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error("useApi must be used within ApiProvider");
  return ctx;
}

export { ApiError };
