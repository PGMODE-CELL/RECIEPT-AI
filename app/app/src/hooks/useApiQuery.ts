import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/providers/ApiProvider";

export function useApiQuery<TData = any>(
  key: string[],
  fetcher: () => Promise<TData>,
  options?: { enabled?: boolean },
) {
  const { isAuthenticated } = useApi();
  const enabled = isAuthenticated && options?.enabled !== false;
  return useQuery<TData>({
    queryKey: key,
    queryFn: fetcher,
    enabled,
    retry: 0,
    staleTime: 30000,
  });
}

export function useApiMutation<TData = any, TVariables = any>(
  key: string[],
  mutationFn: (vars: TVariables) => Promise<TData>,
) {
  const queryClient = useQueryClient();
  return useMutation<TData, Error, TVariables>({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
