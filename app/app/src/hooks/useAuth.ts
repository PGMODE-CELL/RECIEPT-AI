import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { LOGIN_PATH } from "@/const";
import { useApi } from "@/providers/ApiProvider";

const DEMO_USER_KEY = "receiptai_demo_user";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

function getDemoUser() {
  try {
    const stored = localStorage.getItem(DEMO_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

export function getStoredUser() {
  return getDemoUser();
}

export function setDemoUser(user: any) {
  localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user));
}

export function clearDemoUser() {
  localStorage.removeItem(DEMO_USER_KEY);
}

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = LOGIN_PATH } = options ?? {};
  const navigate = useNavigate();
  const apiCtx = useApi();
  const demoUser = useMemo(() => getDemoUser(), []);

  const logout = useCallback(() => {
    clearDemoUser();
    apiCtx.logout();
    navigate(redirectPath);
  }, [apiCtx, navigate, redirectPath]);

  const activeUser = apiCtx.user || demoUser;

  useEffect(() => {
    if (redirectOnUnauthenticated && !apiCtx.isLoading && !activeUser) {
      const currentPath = window.location.pathname;
      if (currentPath !== redirectPath) {
        navigate(redirectPath);
      }
    }
  }, [redirectOnUnauthenticated, apiCtx.isLoading, activeUser, navigate, redirectPath]);

  return useMemo(
    () => ({
      user: activeUser ?? null,
      isAuthenticated: !!activeUser,
      isLoading: apiCtx.isLoading,
      error: null,
      logout,
      refresh: apiCtx.login,
    }),
    [activeUser, apiCtx.isLoading, logout, apiCtx.login],
  );
}
