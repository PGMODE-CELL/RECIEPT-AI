import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type PostgresChangesFilter = {
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
  schema?: string;
  table?: string;
  filter?: string;
};

interface UseSupabaseRealtimeOptions {
  channel?: string;
  filter?: PostgresChangesFilter;
  enabled?: boolean;
}

export function useSupabaseRealtime<T = any>(
  options: UseSupabaseRealtimeOptions,
  callback: (payload: RealtimePostgresChangesPayload<T>) => void,
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (options.enabled === false) return;

    const channelName = options.channel ?? `realtime:${options.filter?.table ?? "default"}`;
    const filter = options.filter ?? {};

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes" as any,
        {
          event: filter.event ?? "*",
          schema: filter.schema ?? "public",
          table: filter.table,
          filter: filter.filter,
        },
        (payload) => {
          callbackRef.current(payload as RealtimePostgresChangesPayload<T>);
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [options.channel, options.filter?.event, options.filter?.schema, options.filter?.table, options.filter?.filter, options.enabled]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  return { unsubscribe };
}

export function useSupabaseBroadcast<T = any>(
  channelName: string,
  options?: { enabled?: boolean },
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (options?.enabled === false) return;

    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelName, options?.enabled]);

  const broadcast = useCallback(
    (event: string, payload: T) => {
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event,
          payload,
        });
      }
    },
    [],
  );

  const onBroadcast = useCallback(
    (event: string, callback: (payload: T) => void) => {
      if (channelRef.current) {
        channelRef.current.on("broadcast", { event }, ({ payload }) => {
          callback(payload as T);
        });
      }
    },
    [],
  );

  return { broadcast, onBroadcast };
}

export function useSupabasePresence(
  channelName: string,
  options?: { enabled?: boolean },
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (options?.enabled === false) return;

    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelName, options?.enabled]);

  const track = useCallback(
    async (state: Record<string, any>) => {
      if (channelRef.current) {
        await channelRef.current.track(state);
      }
    },
    [],
  );

  const untrack = useCallback(async () => {
    if (channelRef.current) {
      await channelRef.current.untrack();
    }
  }, []);

  return { track, untrack };
}
