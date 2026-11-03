"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getDemoBots } from "@/lib/demo-mode";
import { INDUSTRY_TEMPLATES } from "@/lib/industry-templates";
import { botChatId, type AppState, type Bot } from "@/lib/types";
import { OnboardingFlow, type OnboardingData } from "./onboarding";
import { ActivityDashboard } from "./activity-dashboard";
import { UsageDashboard } from "./usage-dashboard";

/**
 * Demo mode (no OPENAI_API_KEY and no ORGO_API_KEY, per /api/env-check): the sample Auto Dealer team,
 * the business setup (onboarding.tsx) on first launch, the teams picked there, and the Activity and
 * Usage dashboards. All of it is client state (localStorage); nothing here runs when keys are set.
 */
type DemoTeam = { id: string; business: string; templateId: string };
type DemoView = null | "setup" | "activity" | "usage";
type DemoCtx = { on: boolean; teams: DemoTeam[]; open: (v: DemoView) => void };

const Ctx = createContext<DemoCtx>({ on: false, teams: [], open: () => {} });
const TEAMS_KEY = "bops-demo-teams";
const SEEN_KEY = "bops-demo-onboarded";
const COLORS = ["#FF9F43", "#2EC4B6", "#7C5CFF", "#FF6B8A", "#4D96FF", "#6BCB77"];

export function useDemo() {
  return useContext(Ctx);
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(false);
  const [teams, setTeams] = useState<DemoTeam[]>([]);
  const [view, setView] = useState<DemoView>(null);

  useEffect(() => {
    fetch("/api/env-check")
      .then((r) => r.json())
      .then((d: { demoMode?: boolean }) => {
        if (!d.demoMode) return;
        setOn(true);
        try {
          setTeams(JSON.parse(localStorage.getItem(TEAMS_KEY) ?? "[]"));
          if (!localStorage.getItem(SEEN_KEY)) setView("setup");
        } catch {}
      })
      .catch(() => {});
  }, []);

  const finish = useCallback((data?: OnboardingData) => {
    localStorage.setItem(SEEN_KEY, "1");
    if (data?.templateId) {
      setTeams((t) => {
        const next = [...t, { id: `${data.templateId}-${Date.now()}`, business: data.businessName, templateId: data.templateId! }];
        localStorage.setItem(TEAMS_KEY, JSON.stringify(next));
        return next;
      });
    }
    setView(null);
  }, []);

  const value = useMemo(() => ({ on, teams, open: setView }), [on, teams]);
  return (
    <Ctx.Provider value={value}>
      {children}
      {on && (
        <div data-demo-badge className="pointer-events-none fixed right-3 top-3 z-[60] rounded-full bg-[#E9FF3B] px-3 py-1 text-[12px] font-semibold text-[#1F1F1E] shadow">
          Demo mode
        </div>
      )}
      {on && view === "setup" && <OnboardingFlow onComplete={finish} onSkip={() => finish()} />}
      {on && (view === "activity" || view === "usage") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setView(null)}>
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setView(null)} className="absolute right-3 top-3 z-10 rounded px-2 text-[18px] text-gray-500 hover:bg-gray-100" aria-label="Close">
              ×
            </button>
            {view === "activity" ? <ActivityDashboard /> : <UsageDashboard workspaceId="demo-workspace" />}
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

/** The state with the demo bots (and the picked teams' bots) in the open workspace, in demo mode only. */
export function withDemoBots(state: AppState | null, demo: DemoCtx): AppState | null {
  if (!state || !demo.on) return state;
  const main = state.bots.find((b) => b.isMain);
  const ws = main?.workspaceId;
  const extra: Bot[] = getDemoBots().filter((b) => !b.isMain);
  demo.teams.forEach((t) => {
    const tpl = INDUSTRY_TEMPLATES[t.templateId];
    tpl?.bots.forEach((b, i) =>
      extra.push({ id: `demo-${t.id}-${i}`, name: b.name, role: `${t.business || tpl.name} · ${b.role}`, color: COLORS[i % COLORS.length], isMain: false, computerStatus: "ready", computer: "shared", instructions: b.instructions }),
    );
  });
  const have = new Set(state.bots.map((b) => b.id));
  const add = extra.filter((b) => !have.has(b.id)).map((b) => ({ ...b, workspaceId: ws }));
  // The sidebar lists chats: each added bot gets its own chat, as a new bot does.
  const chats = add.filter((b) => !state.chats.some((c) => c.id === botChatId(b.id))).map((b, i) => ({ id: botChatId(b.id), kind: "bot" as const, botIds: [b.id], createdAt: Date.now() - i * 1000, typing: [], workspaceId: ws }));
  return { ...state, bots: [...state.bots, ...add], chats: [...state.chats, ...chats] };
}

/** The sidebar's demo row: set up a business, and the Activity and Usage dashboards. */
export function DemoSidebarNav() {
  const demo = useDemo();
  if (!demo.on) return null;
  const btn = "flex-1 rounded-md border border-[#ECECEA] bg-white px-2 py-1.5 text-[12.5px] font-medium text-ink hover:bg-[#EEEEEC]";
  return (
    <div data-demo-nav className="mx-3 mb-1 mt-2 flex flex-col gap-1.5">
      <button onClick={() => demo.open("setup")} className="rounded-md bg-[#1F1F1E] px-2 py-1.5 text-[12.5px] font-semibold text-white hover:bg-black">
        Set up a business
      </button>
      <div className="flex gap-1.5">
        <button onClick={() => demo.open("activity")} className={btn}>Activity</button>
        <button onClick={() => demo.open("usage")} className={btn}>Usage</button>
      </div>
    </div>
  );
}
