import { NextRequest, NextResponse } from "next/server";
import { getState, bot } from "@/lib/server/store";
import {
  getBotUsageToday,
  getWorkspaceUsageToday,
  getUsageLimits,
  getActiveAlerts,
} from "@/lib/server/usage-tracking";
import { workspaceOf } from "@/lib/types";

/**
 * GET /api/usage - Get usage data for a bot or workspace
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const botId = searchParams.get("botId");
    const workspaceId = searchParams.get("workspaceId") || getState().workspace;

    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace specified" },
        { status: 400 }
      );
    }

    const limits = getUsageLimits(workspaceId);
    const workspaceUsage = getWorkspaceUsageToday(workspaceId);
    const alerts = getActiveAlerts(workspaceId);

    // Add bot names to alerts
    const alertsWithNames = alerts.map((alert) => ({
      ...alert,
      botName: alert.botId ? bot(alert.botId)?.name : undefined,
    }));

    // Add bot names to workspace usage breakdown
    const byBotWithNames: Record<string, { tokens: number; cost: number; operations: number; name: string }> = {};
    for (const [id, data] of Object.entries(workspaceUsage.byBot)) {
      const b = bot(id);
      if (b) {
        byBotWithNames[id] = {
          ...data,
          name: b.name,
        };
      }
    }

    const response: any = {
      workspace: {
        tokens: workspaceUsage.tokens,
        cost: workspaceUsage.cost,
        operations: workspaceUsage.operations,
        byBot: byBotWithNames,
      },
      limits,
      alerts: alertsWithNames,
    };

    // Include specific bot data if requested
    if (botId) {
      const b = bot(botId);
      if (!b) {
        return NextResponse.json({ error: "Bot not found" }, { status: 404 });
      }

      const botUsage = getBotUsageToday(botId);
      response.bot = {
        id: botId,
        name: b.name,
        tokens: botUsage.tokens,
        cost: botUsage.cost,
        operations: botUsage.operations,
        paused: b.paused,
        pausedReason: b.pausedReason,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to get usage:", error);
    return NextResponse.json(
      { error: "Failed to load usage data" },
      { status: 500 }
    );
  }
}
