import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ConnectionStatus {
  isConnected: boolean;
  latency: number | null;
  error: string | null;
}

export function SupabaseConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    latency: null,
    error: null,
  });
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      setIsChecking(true);
      const start = Date.now();

      try {
        const { error } = await supabase.from("todos").select("id").limit(1);
        const latency = Date.now() - start;

        if (error) {
          setStatus({
            isConnected: false,
            latency: null,
            error: error.message,
          });
        } else {
          setStatus({
            isConnected: true,
            latency,
            error: null,
          });
        }
      } catch (err) {
        setStatus({
          isConnected: false,
          latency: null,
          error: err instanceof Error ? err.message : "Connection failed",
        });
      } finally {
        setIsChecking(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isChecking) {
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="w-3 h-3 animate-spin" />
        Checking...
      </Badge>
    );
  }

  if (status.isConnected) {
    return (
      <Badge variant="default" className="gap-1 bg-green-500">
        <CheckCircle className="w-3 h-3" />
        Connected ({status.latency}ms)
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="w-3 h-3" />
      Disconnected
    </Badge>
  );
}
