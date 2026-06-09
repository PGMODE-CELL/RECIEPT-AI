import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { LOGIN_PATH } from "@/const";
import { useApi } from "@/providers/ApiProvider";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = LOGIN_PATH } = options ?? {};
  const navigate = useNavigate();
  const apiCtx = useApi();

  const logout = useCallback(() => {
    apiCtx.logout();
    navigate(redirectPath);
  }, [apiCtx, navigate, redirectPath]);

  const activeUser = apiCtx.user;

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
