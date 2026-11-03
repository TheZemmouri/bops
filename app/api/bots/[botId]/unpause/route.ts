import { NextRequest, NextResponse } from "next/server";
import { unpauseBot } from "@/lib/server/usage-tracking";
import { bot } from "@/lib/server/store";

/**
 * POST /api/bots/[botId]/unpause - Unpause a bot
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ botId: string }> }
) {
  try {
    const { botId } = await context.params;
    
    const b = bot(botId);
    if (!b) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    unpauseBot(botId);
    
    return NextResponse.json({ success: true, botId });
  } catch (error) {
    console.error("Failed to unpause bot:", error);
    return NextResponse.json(
      { error: "Failed to unpause bot" },
      { status: 500 }
    );
  }
}
