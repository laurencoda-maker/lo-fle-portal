"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Chapter = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  level: string | null;
  unit: string | null;
  sort_order: number;
};

type Progress = {
  chapter_id: string;
  status: "not_started" | "in_progress" | "done" | "custom";
  score: number | null;
  total: number | null;
};

type Profile = { full_name: string; role: "student" | "teacher"; level: string | null };

const STATUS_LABEL: Record<string, string> = {
  not_started: "À faire",
  in_progress: "En cours",
  done: "Terminé",
  custom: "Personnalisé",
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [progressByChapter, setProgressByChapter] = useState<Record<string, Progress>>({});

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("full_name, role, level")
        .eq("id", user.id)
        .single();

      const { data: chapterRows } = await supabase
        .from("chapters")
        .select("id, slug, title, subtitle, level, unit, sort_order")
        .order("sort_order", { ascending: true });

      const { data: progressRows } = await supabase
        .from("progress")
        .select("chapter_id, status, score, total")
        .eq("student_id", user.id);

      if (!active) return;

      setProfile((profileRow as Profile) ?? null);
      setChapters((chapterRows as Chapter[]) ?? []);
      const map: Record<string, Progress> = {};
      (progressRows as Progress[] | null)?.forEach((p) => {
        map[p.chapter_id] = p;
      });
      setProgressByChapter(map);
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <div className="wrap" style={{ textAlign: "center", paddingTop: 120 }}>
        <p style={{ color: "var(--ink-soft)" }}>Chargement…</p>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="top-row">
        <div>
          <div className="brand">
            Mon espace <span className="accent">FLE</span>
          </div>
          <span className="who">
            {profile ? `Bonjour ${profile.full_name}` : ""} {profile?.level ? `· niveau ${profile.level}` : ""}
          </span>
        </div>
        <button className="btn ghost" onClick={handleLogout}>
          Se déconnecter
        </button>
      </div>

      <h2 style={{ fontFamily: "Georgia, serif", color: "var(--navy)", marginBottom: 4 }}>Tes chapitres</h2>
      <p style={{ color: "var(--ink-soft)", marginTop: 0, marginBottom: 22, fontSize: 14 }}>
        Clique sur un chapitre pour l'ouvrir et t'entraîner.
      </p>

      {chapters.length === 0 ? (
        <div className="card-shell empty">Aucun chapitre disponible pour l'instant.</div>
      ) : (
        <div className="chapter-grid">
          {chapters.map((ch) => {
            const p = progressByChapter[ch.id];
            const status = p?.status ?? "not_started";
            return (
              <Link key={ch.id} href={`/chapitre/${ch.slug}`} className="chapter-card">
                {ch.level && <span className="lvl">{ch.level}</span>}
                <span className="meta">
                  <h3>{ch.title}</h3>
                  <span className="unit">
                    {ch.subtitle}
                    {ch.unit ? ` · ${ch.unit}` : ""}
                  </span>
                </span>
                <span className={`status ${status}`}>
                  {STATUS_LABEL[status]}
                  {p?.total ? ` · ${p.score}/${p.total}` : ""}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
