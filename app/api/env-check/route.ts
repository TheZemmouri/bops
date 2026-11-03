import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo-mode";

export const dynamic = "force-dynamic";

/**
 * Returns environment status including demo mode detection.
 */
export async function GET() {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasOrgo = !!process.env.ORGO_API_KEY;
  
  return NextResponse.json({
    demoMode: isDemoMode(),
    hasOpenAI,
    hasOrgo,
  });
}
