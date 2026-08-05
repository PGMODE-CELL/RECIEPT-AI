import type { Database } from "./database.types";

declare global {
  namespace App {
    interface Locals {
      supabase: import("@supabase/supabase-js").SupabaseClient<Database>;
    }
  }
}

export type { Database } from "./database.types";
