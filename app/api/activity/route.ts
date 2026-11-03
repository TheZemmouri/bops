import { getDemoActivityResponse, isDemoMode } from "@/lib/demo-mode";
import { NextResponse } from "next/server";
import { getState } from "@/lib/server/store";
import { live, type Session, type Routine } from "@/lib/types";

/**
 * GET /api/activity - Get recent bot activity for dashboard
 */
export async function GET() {
  try {
    // Demo mode (no keys): the demo team's sample activity.
    if (isDemoMode()) return NextResponse.json(getDemoActivityResponse());
    const state = getState();
    const now = Date.now();
    const last24Hours = now - 24 * 60 * 60 * 1000;
    const last7Days = now - 7 * 24 * 60 * 60 * 1000;

    // Get recent bot messages
    const recentMessages = state.messages
      .filter((m) => m.botId && m.at && m.at > last24Hours)
      .sort((a, b) => (b.at || 0) - (a.at || 0))
      .slice(0, 50)
      .map((m) => {
        const bot = state.bots.find((b) => b.id === m.botId);
        return {
          id: m.id,
          botId: m.botId,
          botName: bot?.name || "Unknown",
          text: m.text?.substring(0, 200) || "",
          createdAt: m.at,
          chatId: m.chatId,
        };
      });

    // Get active sessions
    const activeSessions = state.sessions
      .filter((s) => live(s))
      .map((s: Session) => {
        const bot = state.bots.find((b) => b.id === s.botId);
        return {
          id: s.id,
          botId: s.botId,
          botName: bot?.name || "Unknown",
          goal: s.goal?.substring(0, 150) || "",
          startedAt: s.startedAt,
          status: s.status,
          runsOn: s.runsOn,
        };
      });

    // Get routine runs in last 7 days
    const routineActivity = state.routines
      ?.filter((r: Routine) => r.lastRunAt && r.lastRunAt > last7Days)
      .sort((a: Routine, b: Routine) => (b.lastRunAt || 0) - (a.lastRunAt || 0))
      .slice(0, 30)
      .map((r: Routine) => {
        const bot = state.bots.find((b) => b.id === r.botId);
        return {
          routineId: r.id,
          name: r.title,
          botId: r.botId,
          botName: bot?.name || "Unknown",
          lastRun: r.lastRunAt,
          status: r.enabled ? "enabled" : "disabled",
          nextRun: r.nextRunAt,
        };
      }) || [];

    // Bot statistics
    const botStats = state.bots.map((bot) => {
      const botMessages = state.messages.filter(
        (m) => m.botId === bot.id && m.at && m.at > last7Days
      );
      const botSessions = state.sessions.filter(
        (s) => s.botId === bot.id && s.startedAt && s.startedAt > last7Days
      );
      const botRoutines = state.routines?.filter((r: Routine) => r.botId === bot.id) || [];
      const activeRoutines = botRoutines.filter((r: Routine) => r.enabled);

      return {
        id: bot.id,
        name: bot.name,
        role: bot.role,
        messagesLast7Days: botMessages.length,
        tasksLast7Days: botSessions.length,
        activeRoutines: activeRoutines.length,
        totalRoutines: botRoutines.length,
        computerStatus: bot.computerStatus,
        email: bot.email,
        phone: bot.phone,
      };
    });

    return NextResponse.json({
      summary: {
        totalBots: state.bots.length,
        activeSessions: activeSessions.length,
        messagesLast24Hours: recentMessages.length,
        activeRoutines: state.routines?.filter((r: Routine) => r.enabled).length || 0,
      },
      recentMessages,
      activeSessions,
      routineActivity,
      botStats,
    });
  } catch (error) {
    console.error("Failed to get activity:", error);
    return NextResponse.json(
      { error: "Failed to load activity" },
      { status: 500 }
    );
  }
}
