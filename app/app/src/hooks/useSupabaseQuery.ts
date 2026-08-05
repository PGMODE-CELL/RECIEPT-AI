import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { PostgrestResponse } from "@supabase/supabase-js";

interface UseSupabaseQueryOptions<T> {
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useSupabaseQuery<T = any>(
  table: string,
  query?: string,
  options?: UseSupabaseQueryOptions<T>,
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (options?.enabled === false) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let builder = supabase.from(table).select(query || "*");
      const result: PostgrestResponse<T> = await builder;

      if (result.error) {
        throw new Error(result.error.message);
      }

      setData(result.data);
      options?.onSuccess?.(result.data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      options?.onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [table, query, options?.enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    setIsLoading(true);
    fetchData();
  }, [fetchData]);

  return { data, error, isLoading, refetch };
}

export function useSupabaseInsert<T = any>(table: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const insert = useCallback(async (row: Partial<T>) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await supabase.from(table).insert(row).select().single();

      if (result.error) {
        throw new Error(result.error.message);
      }

      setData(result.data as T);
      return result.data as T;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [table]);

  return { data, error, isLoading, insert };
}

export function useSupabaseUpdate<T = any>(table: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const update = useCallback(async (id: string | number, updates: Partial<T>) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await supabase
        .from(table)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (result.error) {
        throw new Error(result.error.message);
      }

      setData(result.data as T);
      return result.data as T;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [table]);

  return { data, error, isLoading, update };
}

export function useSupabaseDelete(table: string) {
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const remove = useCallback(async (id: string | number) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await supabase.from(table).delete().eq("id", id);

      if (result.error) {
        throw new Error(result.error.message);
      }

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [table]);

  return { error, isLoading, remove };
}
