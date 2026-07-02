"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkedSession, setCheckedSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/dashboard");
      } else {
        setCheckedSession(true);
      }
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      } else {
        if (!fullName.trim()) {
          throw new Error("Merci d'indiquer ton nom.");
        }
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (signUpError) throw signUpError;
      }
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  if (!checkedSession) return null;

  return (
    <div className="wrap" style={{ maxWidth: 440, paddingTop: 90 }}>
      <div className="brand">
        Mon espace <span className="accent">FLE</span>
      </div>
      <p style={{ color: "var(--ink-soft)", marginTop: 0, marginBottom: 28, fontSize: 14 }}>
        Français langue étrangère — cours de Lo
      </p>

      <div className="card-shell">
        <div className="tabs">
          <button
            type="button"
            className={mode === "signin" ? "active" : ""}
            onClick={() => setMode("signin")}
          >
            Se connecter
          </button>
          <button
            type="button"
            className={mode === "signup" ? "active" : ""}
            onClick={() => setMode("signup")}
          >
            Créer un compte
          </button>
        </div>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div className="field">
              <label htmlFor="fullName">Ton prénom</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <button type="submit" className="btn" style={{ width: "100%" }} disabled={loading}>
            {loading ? "…" : mode === "signin" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>
      </div>
    </div>
  );
}
