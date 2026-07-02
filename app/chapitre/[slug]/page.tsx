"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Chapter = {
  id: string;
  title: string;
  content_html: string;
  content_css: string;
};

function norm(s: string) {
  return (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[‘’']/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/, "");
}
function isMatch(val: string, answer?: string) {
  if (!answer) return null;
  return answer.split("|").some((a) => norm(a) === norm(val));
}
function setIcon(el: Element, ok: boolean) {
  let icon = el.nextElementSibling as HTMLElement | null;
  if (!icon || !icon.classList.contains("icon")) {
    icon = document.createElement("span");
    icon.className = "icon";
    el.insertAdjacentElement("afterend", icon);
  }
  icon.classList.remove("correct", "incorrect");
  icon.classList.add(ok ? "correct" : "incorrect");
  icon.textContent = ok ? "✓" : "✗";
}

export default function ChapterPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{ userId: string | null; chapterId: string | null; checked: Record<string, { correct: number; total: number }> }>({
    userId: null,
    chapterId: null,
    checked: {},
  });

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: chapterRow, error } = await supabase
        .from("chapters")
        .select("id, title, content_html, content_css")
        .eq("slug", params.slug)
        .single();

      if (!active) return;

      if (error || !chapterRow) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      stateRef.current.userId = user.id;
      stateRef.current.chapterId = chapterRow.id;
      setChapter(chapterRow as Chapter);
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [router, params.slug]);

  // Wire up the self-check engine once the chapter HTML is in the DOM.
  useEffect(() => {
    if (!chapter || !contentRef.current) return;

    async function saveProgress() {
      const { userId, chapterId, checked } = stateRef.current;
      if (!userId || !chapterId) return;

      const panelIds = Object.keys(checked);
      const totalPanelsOnPage = contentRef.current!.querySelectorAll(".check-btn").length;
      const correct = panelIds.reduce((sum, k) => sum + checked[k].correct, 0);
      const total = panelIds.reduce((sum, k) => sum + checked[k].total, 0);
      const status = panelIds.length >= totalPanelsOnPage && totalPanelsOnPage > 0 ? "done" : "in_progress";

      await supabase
        .from("progress")
        .upsert(
          { student_id: userId, chapter_id: chapterId, status, score: correct, total, updated_at: new Date().toISOString() },
          { onConflict: "student_id,chapter_id" }
        );
    }

    function checkGroup(panelId: string, scoreId: string) {
      const panel = document.getElementById(panelId);
      if (!panel) return;
      let total = 0;
      let correct = 0;

      panel.querySelectorAll<HTMLInputElement>("input.blank[data-answer]").forEach((inp) => {
        total++;
        const ok = !!isMatch(inp.value, inp.dataset.answer);
        inp.classList.remove("correct", "incorrect");
        inp.classList.add(ok ? "correct" : "incorrect");
        setIcon(inp, ok);
        if (ok) correct++;
      });

      panel.querySelectorAll<HTMLSelectElement>("select.match[data-answer]").forEach((sel) => {
        total++;
        const ok = sel.value === sel.dataset.answer;
        sel.classList.remove("correct", "incorrect");
        sel.classList.add(ok ? "correct" : "incorrect");
        setIcon(sel, ok);
        if (ok) correct++;
      });

      panel.querySelectorAll<HTMLElement>(".toggle-pair[data-answer]:not(.example)").forEach((tp) => {
        total++;
        const checked = tp.querySelector<HTMLInputElement>("input:checked");
        const ok = !!checked && checked.value === tp.dataset.answer;
        tp.classList.remove("correct", "incorrect");
        tp.classList.add(ok ? "correct" : "incorrect");
        setIcon(tp, ok);
        if (ok) correct++;
      });

      panel.querySelectorAll<HTMLInputElement>("input[type=checkbox][data-correct]").forEach((cb) => {
        total++;
        const shouldBe = cb.dataset.correct === "true";
        const cell = cb.closest("td");
        cell?.classList.remove("correct", "incorrect", "missed");
        if (cb.checked && shouldBe) {
          cell?.classList.add("correct");
          correct++;
        } else if (cb.checked && !shouldBe) {
          cell?.classList.add("incorrect");
        } else if (!cb.checked && shouldBe) {
          cell?.classList.add("missed");
        } else {
          correct++;
        }
      });

      panel.querySelectorAll<HTMLElement>(".pick[data-correct]").forEach((p) => {
        total++;
        const shouldBe = p.dataset.correct === "true";
        const cb = p.querySelector<HTMLInputElement>("input[type=checkbox]");
        const checked = !!cb && cb.checked;
        p.classList.remove("correct", "incorrect", "missed");
        if (checked && shouldBe) {
          p.classList.add("correct");
          correct++;
        } else if (checked && !shouldBe) {
          p.classList.add("incorrect");
        } else if (!checked && shouldBe) {
          p.classList.add("missed");
        } else {
          correct++;
        }
      });

      const scoreEl = document.getElementById(scoreId);
      if (scoreEl) scoreEl.textContent = `Score : ${correct} / ${total}`;

      stateRef.current.checked[panelId] = { correct, total };
      saveProgress();
    }

    (window as any).checkGroup = checkGroup;

    return () => {
      delete (window as any).checkGroup;
    };
  }, [chapter]);

  if (loading) {
    return (
      <div className="wrap" style={{ textAlign: "center", paddingTop: 120 }}>
        <p style={{ color: "var(--ink-soft)" }}>Chargement…</p>
      </div>
    );
  }

  if (notFound || !chapter) {
    return (
      <div className="wrap">
        <p>Ce chapitre n'existe pas.</p>
        <Link href="/dashboard" className="back-link">
          ← Retour au tableau de bord
        </Link>
      </div>
    );
  }

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: chapter.content_css }} />
      <div className="wrap" style={{ maxWidth: 900 }}>
        <div className="chapter-header-bar">
          <Link href="/dashboard" className="back-link">
            ← Retour au tableau de bord
          </Link>
        </div>
        <div ref={contentRef} dangerouslySetInnerHTML={{ __html: chapter.content_html }} />
      </div>
    </div>
  );
}
