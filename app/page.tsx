"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      router.replace(data.session ? "/dashboard" : "/login");
    });
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="wrap" style={{ textAlign: "center", paddingTop: 120 }}>
      <p style={{ color: "var(--ink-soft)" }}>Chargement…</p>
    </div>
  );
}
