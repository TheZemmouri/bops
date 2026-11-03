/**
 * Demo Mode - Provides realistic mock data when API keys are not configured.
 * Allows full app exploration without external services.
 */

import type { Bot, Message, Session, Routine, Workspace } from "./types";

export function isDemoMode(): boolean {
  // Check if essential API keys are present
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasOrgo = !!process.env.ORGO_API_KEY;
  
  // Demo only with NO keys at all: any real key set means the real app (and its sign-in).
  return !hasOpenAI && !hasOrgo;
}

export function getDemoBots(): Bot[] {
  return [
    {
      id: "boppy",
      name: "Boppy",
      role: "Main Assistant",
      color: "#E9FF3B",
      isMain: true,
      computerStatus: "ready",
      instructions: "I'm the main bot that coordinates the team and handles general tasks.",
      email: "boppy@demo.bops.bot",
    },
    {
      id: "sales-manager",
      name: "Sales Manager",
      role: "Lead Management & Customer Relations",
      color: "#FF9F43",
      isMain: false,
      computerStatus: "ready",
      computer: "shared",
      instructions: `You manage the dealership's sales pipeline and customer relationships. Your responsibilities:
- Track and qualify incoming leads
- Follow up with prospects at the right time
- Maintain customer contact database
- Schedule test drives and send reminders
- Handle trade-in inquiries
Always be professional, responsive, and keep accurate records.`,
      email: "sales@demo.bops.bot",
    },
    {
      id: "inventory-tracker",
      name: "Inventory Tracker",
      role: "Vehicle Inventory & Listings",
      color: "#2EC4B6",
      isMain: false,
      computerStatus: "ready",
      computer: "shared",
      instructions: `You manage the dealership's vehicle inventory and online listings. Your responsibilities:
- Track all vehicles in stock
- Update online listings
- Monitor days on lot
- Generate inventory reports
Accuracy is critical - verify details before any listing goes live.`,
      email: "inventory@demo.bops.bot",
    },
  ];
}

export function getDemoMessages(): Message[] {
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  
  return [
    {
      id: "msg-1",
      chatId: "chat-boppy",
      role: "user" as const,
      text: "What's on the schedule today?",
      at: now - 2 * hour,
    },
    {
      id: "msg-2",
      chatId: "chat-boppy",
      role: "bot" as const,
      botId: "boppy",
      text: "Good morning! Here's what's scheduled:\n\n- Daily Lead Review at 8:00 AM (Sales Manager)\n- Inventory Sync at 7:00 AM (Inventory Tracker)\n- Follow-up Reminders at 10:00 AM (Sales Manager)\n\nAll routines are set up and ready to run. Would you like me to enable them?",
      at: now - 2 * hour + 5000,
    },
    {
      id: "msg-3",
      chatId: "chat-sales",
      role: "user" as const,
      text: "How many leads came in yesterday?",
      at: now - 1 * hour,
    },
    {
      id: "msg-4",
      chatId: "chat-sales",
      role: "bot" as const,
      botId: "sales-manager",
      text: "Yesterday we received 8 new leads:\n\n- 3 from website contact form\n- 2 from phone calls\n- 2 walk-ins\n- 1 referral\n\n5 have been contacted, 3 are pending follow-up today. I'll send reminders at 10 AM.",
      at: now - 1 * hour + 8000,
    },
  ];
}

export function getDemoSessions(): Session[] {
  const now = Date.now();
  
  return [
    {
      id: "session-1",
      chatId: "chat-sales",
      botId: "sales-manager",
      sentVia: "sam" as const,
      goal: "Send follow-up emails to prospects from yesterday",
      title: "Follow-up emails",
      status: "running" as const,
      startedAt: now - 5 * 60 * 1000,
      createdAt: now - 5 * 60 * 1000,
      runsOn: "cloud" as const,
      host: "orgo" as const,
      replies: [],
      steps: [],
    },
  ];
}

export function getDemoRoutines(): Routine[] {
  const now = Date.now();
  const tomorrow8am = new Date();
  tomorrow8am.setDate(tomorrow8am.getDate() + 1);
  tomorrow8am.setHours(8, 0, 0, 0);
  
  const today10am = new Date();
  today10am.setHours(10, 0, 0, 0);
  if (today10am.getTime() < now) {
    today10am.setDate(today10am.getDate() + 1);
  }
  
  const today7pm = new Date();
  today7pm.setHours(19, 0, 0, 0);
  if (today7pm.getTime() < now) {
    today7pm.setDate(today7pm.getDate() + 1);
  }

  return [
    {
      id: "routine-1",
      botId: "sales-manager",
      title: "Daily Lead Review",
      goal: "Check new leads and prioritize follow-ups",
      schedule: {
        kind: "weekdays" as const,
        time: "8:00 AM",
      },
      enabled: false,
      nextRunAt: tomorrow8am.getTime(),
      lastRunAt: now - 24 * 60 * 60 * 1000,
    },
    {
      id: "routine-2",
      botId: "sales-manager",
      title: "Follow-up Reminders",
      goal: "Send follow-ups to prospects who haven't responded",
      schedule: {
        kind: "weekdays" as const,
        time: "10:00 AM",
      },
      enabled: false,
      nextRunAt: today10am.getTime(),
    },
    {
      id: "routine-3",
      botId: "inventory-tracker",
      title: "Inventory Sync",
      goal: "Update online listings with current inventory",
      schedule: {
        kind: "daily" as const,
        time: "7:00 AM",
      },
      enabled: false,
      nextRunAt: tomorrow8am.getTime() - 60 * 60 * 1000,
    },
    {
      id: "routine-4",
      botId: "inventory-tracker",
      title: "Aging Inventory Alert",
      goal: "Flag vehicles on lot over 60 days",
      schedule: {
        kind: "weekly" as const,
        day: 1,
        time: "9:00 AM",
      },
      enabled: false,
      nextRunAt: today7pm.getTime(),
    },
  ];
}

export function getDemoWorkspace(): Workspace {
  return {
    id: "demo-workspace",
    name: "Demo Auto Dealer",
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    usageLimits: {
      costPerBotPerDay: 500, // $5
      costPerWorkspacePerDay: 2000, // $20
      alertThreshold: 0.8,
    },
  };
}

export function getDemoUsageRecords() {
  const now = Date.now();
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  
  return [
    {
      botId: "boppy",
      workspaceId: "demo-workspace",
      timestamp: startOfDay + 8 * 60 * 60 * 1000,
      tokenCount: 1200,
      estimatedCost: 6,
      model: "gpt-4",
      operation: "chat" as const,
    },
    {
      botId: "sales-manager",
      workspaceId: "demo-workspace",
      timestamp: startOfDay + 9 * 60 * 60 * 1000,
      tokenCount: 3500,
      estimatedCost: 18,
      model: "gpt-4",
      operation: "task" as const,
    },
    {
      botId: "sales-manager",
      workspaceId: "demo-workspace",
      timestamp: startOfDay + 10 * 60 * 60 * 1000,
      tokenCount: 2800,
      estimatedCost: 14,
      model: "gpt-4",
      operation: "routine" as const,
    },
    {
      botId: "inventory-tracker",
      workspaceId: "demo-workspace",
      timestamp: startOfDay + 7 * 60 * 60 * 1000,
      tokenCount: 4200,
      estimatedCost: 21,
      model: "gpt-4",
      operation: "task" as const,
    },
  ];
}

export function initDemoState() {
  if (typeof window === "undefined") return null;
  
  return {
    bots: getDemoBots(),
    messages: getDemoMessages(),
    sessions: getDemoSessions(),
    routines: getDemoRoutines(),
    workspaces: [getDemoWorkspace()],
    workspace: "demo-workspace",
    usageRecords: getDemoUsageRecords(),
    businessInfo: {
      name: "Demo Auto Dealer",
      industry: "Auto Dealer",
      templateId: "auto-dealer",
      setupAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    },
    onboardingComplete: true,
  };
}

/** /api/usage's answer in demo mode: today's sample usage per demo bot. */
export function getDemoUsageResponse() {
  const names = Object.fromEntries(getDemoBots().map((b) => [b.id, b.name]));
  const byBot: Record<string, { tokens: number; cost: number; operations: number; name: string }> = {};
  let tokens = 0;
  let cost = 0;
  for (const r of getDemoUsageRecords()) {
    const e = (byBot[r.botId] ??= { tokens: 0, cost: 0, operations: 0, name: names[r.botId] ?? r.botId });
    e.tokens += r.tokenCount;
    e.cost += r.estimatedCost;
    e.operations += 1;
    tokens += r.tokenCount;
    cost += r.estimatedCost;
  }
  return {
    workspace: { tokens, cost, operations: getDemoUsageRecords().length, byBot },
    limits: getDemoWorkspace().usageLimits,
    alerts: [],
  };
}

/** /api/activity's answer in demo mode: the demo team's messages, task and routines. */
export function getDemoActivityResponse() {
  const bots = getDemoBots();
  const name = (id?: string) => bots.find((b) => b.id === id)?.name ?? "Bot";
  const msgs = getDemoMessages().filter((m) => m.role === "bot");
  const routines = getDemoRoutines();
  const sessions = getDemoSessions();
  return {
    summary: { totalBots: bots.length, activeSessions: sessions.length, messagesLast24Hours: msgs.length, activeRoutines: routines.length },
    recentMessages: msgs.map((m) => ({ id: m.id, botId: m.botId!, botName: name(m.botId), text: m.text, createdAt: m.at })),
    activeSessions: sessions.map((s) => ({ id: s.id, botId: s.botId, botName: name(s.botId), goal: s.goal, startedAt: s.startedAt ?? s.createdAt, status: s.status, runsOn: s.runsOn })),
    routineActivity: routines.map((r) => ({ routineId: r.id, name: r.title, botId: r.botId, botName: name(r.botId), lastRun: r.lastRunAt, status: r.enabled ? "on" : "off (review first)", nextRun: r.nextRunAt })),
    botStats: bots.map((b) => {
      const mine = routines.filter((r) => r.botId === b.id);
      return { id: b.id, name: b.name, role: b.role, messagesLast7Days: msgs.filter((m) => m.botId === b.id).length, tasksLast7Days: sessions.filter((s) => s.botId === b.id).length, activeRoutines: mine.length, totalRoutines: mine.length };
    }),
  };
}
