import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://leayhimwhbsoxwmtgbqf.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlYXloaW13aGJzb3h3bXRnYnFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MDMxMjgsImV4cCI6MjA5NjM3OTEyOH0.bTYZK2R-ssPUUQDzyTd2up4KxEqGhkdw9m41Z4YJVgY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

export type Stage = "watching" | "in_progress" | "submitted" | "closed";
export type SubmissionStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected";

export interface Agency {
  id: string;
  supabase_user_id: string;
  brand_name: string;
  reddit_username: string;
}
