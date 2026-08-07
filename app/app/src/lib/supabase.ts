import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://qiducstnjolajlbzwufb.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_dn5bOKBRizqqCDyHkJsg1g_fZRoEroP";

export const supabase = createBrowserClient(supabaseUrl, supabaseKey);
