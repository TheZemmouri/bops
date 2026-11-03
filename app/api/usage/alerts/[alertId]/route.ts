import { NextRequest, NextResponse } from "next/server";
import { dismissAlert } from "@/lib/server/usage-tracking";

/**
 * DELETE /api/usage/alerts/[alertId] - Dismiss a usage alert
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ alertId: string }> }
) {
  try {
    const { alertId } = await context.params;
    dismissAlert(alertId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to dismiss alert:", error);
    return NextResponse.json(
      { error: "Failed to dismiss alert" },
      { status: 500 }
    );
  }
}
