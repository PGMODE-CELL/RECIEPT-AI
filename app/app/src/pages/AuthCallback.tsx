import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error) {
          console.error("Auth callback error:", error);
          setError(error.message);
        } else if (data.session) {
          navigate("/dashboard");
        } else {
          setError("No session created");
        }
      });
    } else {
      setError("No code in URL");
    }
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p className="text-red-500">Error: {error}</p>
        <button onClick={() => navigate("/supabase-login")} className="text-blue-500 underline">Back to Login</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
    </div>
  );
}
