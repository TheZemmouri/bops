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
    const createdBots: Array<{ id: string; name: string; role: string; routines: number }> = [];
    const workspaceId = getState().workspace;

    for (const botTemplate of template.bots) {
      const botResult = await createBot(
        botTemplate.name,
        botTemplate.role,
        workspaceId,
        false // shared computer by default
      );

      if ("error" in botResult) {
        console.error(`Failed to create bot ${botTemplate.name}:`, botResult.error);
        continue;
      }

      // Set bot instructions
      update((state) => {
        const bot = state.bots.find((b) => b.id === botResult.botId);
        if (bot) {
          bot.instructions = botTemplate.instructions;
        }
      });

      // Create suggested routines for this bot
      let routinesCreated = 0;
      if (botTemplate.suggestedRoutines) {
        const { createRoutine } = await import("@/lib/server/routines");
        
        for (const routineTemplate of botTemplate.suggestedRoutines) {
          try {
            // Parse schedule (simple format for now)
            const schedule = parseSchedule(routineTemplate.schedule);
            
            const routineResult = createRoutine(
              botResult.botId,
              routineTemplate.name,
              routineTemplate.description,
              schedule,
              {
                run: routineTemplate.type === "task" ? "task" : "chat",
              }
            );
            
            if (routineResult.routine) {
              routinesCreated++;
              // Disable by default so user can enable them
              update((state) => {
                const routine = state.routines.find((r) => r.id === routineResult.routine!.id);
                if (routine) {
                  routine.enabled = false;
                }
              });
            }
          } catch (error) {
            console.error(`Failed to create routine ${routineTemplate.name}:`, error);
          }
        }
      }

      createdBots.push({
        id: botResult.botId,
        name: botTemplate.name,
        role: botTemplate.role,
        routines: routinesCreated,
      });
    }

// Helper to parse schedule strings
function parseSchedule(scheduleStr: string): any {
  // Simple parser for common schedule formats
  // "Daily at 8:00 AM" -> every day at 8am
  // "Weekdays at 10:00 AM" -> Monday-Friday at 10am
  // "Mondays at 9:00 AM" -> Every Monday at 9am
  // "Every 2 hours, 8 AM to 10 PM" -> every 2 hours in range
  
  const lowerStr = scheduleStr.toLowerCase();
  
  // Parse time
  const timeMatch = scheduleStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  let hour = 9;
  let minute = 0;
  
  if (timeMatch) {
    hour = parseInt(timeMatch[1]);
    minute = parseInt(timeMatch[2]);
    if (timeMatch[3].toUpperCase() === "PM" && hour !== 12) {
      hour += 12;
    } else if (timeMatch[3].toUpperCase() === "AM" && hour === 12) {
      hour = 0;
    }
  }
  
  if (lowerStr.includes("every") && lowerStr.includes("hour")) {
    // "Every 2 hours"
    const hoursMatch = lowerStr.match(/every\s+(\d+)\s+hour/);
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 2;
    return {
      kind: "every" as const,
      minutes: hours * 60,
    };
  }
  
  if (lowerStr.includes("weekday")) {
    // "Weekdays at 10:00 AM"
    return {
      kind: "week" as const,
      days: [1, 2, 3, 4, 5], // Monday-Friday
      hour,
      minute,
    };
  }
  
  if (lowerStr.includes("monday") || lowerStr.includes("tuesday") || 
      lowerStr.includes("wednesday") || lowerStr.includes("thursday") ||
      lowerStr.includes("friday") || lowerStr.includes("saturday") || 
      lowerStr.includes("sunday")) {
    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6
    };
    
    const days = Object.entries(dayMap)
      .filter(([day]) => lowerStr.includes(day))
      .map(([, num]) => num);
    
    return {
      kind: "week" as const,
      days,
      hour,
      minute,
    };
  }
  
  // Default: daily at specified time
  return {
    kind: "day" as const,
    hour,
    minute,
  };
}

    // Mark onboarding as complete
    update((state) => {
      state.onboardingComplete = true;
    });

    // Track onboarding completion (using bot_created event for now)
    trackServerEvent("bops_bot_created", {
      own_computer: false,
      workspace_bots: createdBots.length,
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
