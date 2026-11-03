import { NextRequest, NextResponse } from "next/server";
import { createBot } from "@/lib/server/bots";
import { getState, update } from "@/lib/server/store";
import { findTemplateMatch, getAllTemplates } from "@/lib/industry-templates";
import { trackServerEvent } from "@/lib/server/analytics";

/**
 * GET /api/onboarding - Get all available industry templates
 */
export async function GET() {
  try {
    const templates = getAllTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Failed to get templates:", error);
    return NextResponse.json(
      { error: "Failed to load templates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/onboarding - Complete onboarding and create bot team
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      businessName,
      industry,
      website,
      description,
      templateId,
    } = body;

    if (!businessName?.trim()) {
      return NextResponse.json(
        { error: "Business name is required" },
        { status: 400 }
      );
    }

    // Find or use specified template
    let template;
    if (templateId) {
      const templates = getAllTemplates();
      template = templates.find((t) => t.id === templateId);
    } else if (description) {
      template = findTemplateMatch(description);
    }

    if (!template) {
      return NextResponse.json(
        { error: "Could not find a matching template" },
        { status: 400 }
      );
    }

    // Store business info
    update((state) => {
      if (!state.owner) {
        state.owner = { name: "", about: "", timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
      }
      state.businessInfo = {
        name: businessName,
        industry: industry || template.name,
        website: website || "",
        description: description || "",
        templateId: template.id,
        setupAt: Date.now(),
      };
    });

    // Create the bot team
    const createdBots: Array<{ id: string; name: string; role: string }> = [];
    const workspaceId = getState().workspace;

    for (const botTemplate of template.bots) {
      const result = await createBot(
        botTemplate.name,
        botTemplate.role,
        workspaceId,
        false // shared computer by default
      );

      if ("error" in result) {
        console.error(`Failed to create bot ${botTemplate.name}:`, result.error);
        continue;
      }

      createdBots.push({
        id: result.botId,
        name: botTemplate.name,
        role: botTemplate.role,
      });

      // Set bot instructions
      update((state) => {
        const bot = state.bots.find((b) => b.id === result.botId);
        if (bot) {
          bot.instructions = botTemplate.instructions;
        }
      });
    }

    // Mark onboarding as complete
    update((state) => {
      state.onboardingComplete = true;
    });

    trackServerEvent("bops_onboarding_completed", {
      template_id: template.id,
      bots_created: createdBots.length,
      has_website: !!website,
    });

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
      },
      bots: createdBots,
      message: `Created ${createdBots.length} bots for ${businessName}`,
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
