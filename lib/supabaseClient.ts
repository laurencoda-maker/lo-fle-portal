"use client";

import { createClient } from "@supabase/supabase-js";

// These are public, client-safe keys (protected by Row Level Security on
// the Supabase side), so shipping them as fallback defaults is fine even
// if the Vercel project env vars aren't set.
const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://crylugjgnuznzivwhbjk.supabase.co";
const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyeWx1Z2pnbnV6bnppdndoYmprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5ODE5NjksImV4cCI6MjA5ODU1Nzk2OX0.p51E5awPJsNp0ojXdmqJc1__cx0Ilfw8Y23rqi5xGPo";

// Single shared browser client. Session is persisted in localStorage by
// default, which is all we need for a client-rendered portal like this one.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
