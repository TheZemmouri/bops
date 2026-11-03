import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Returns environment status including demo mode detection.
 */
export async function GET() {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasOrgo = !!process.env.ORGO_API_KEY;
  
  return NextResponse.json({
    demoMode: !hasOpenAI || !hasOrgo,
    hasOpenAI,
    hasOrgo,
  });
}
