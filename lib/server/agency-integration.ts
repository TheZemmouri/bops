import "server-only";
import { createBot, bot } from "./bots";
import { getState, update } from "./store";
import { AGENCY_TEAM } from "@/lib/agency-config";
import { createJob, getJob, updateJobStatus, updateStageStatus, addApprovalGate, type AgencyJob } from "./jobs";
import { trackServerEvent } from "./analytics";

/**
 * Installer.report Agency Integration
 * 
 * Wires jobs and workflows into Bops' existing bot system:
 * - Seeds agency bots
 * - Dispatches jobs as bot tasks
 * - Hooks approval gates into Bops' approval UI
 * - Advances workflow stages on bot handoffs
 */

/**
 * Seed the 8 Installer.report agency bots
 * Creates them in the current workspace if they don't exist
 */
export async function seedAgencyBots(): Promise<{
  created: string[];
  existing: string[];
  errors: Array<{ botId: string; error: string }>;
}> {
  const state = getState();
  const workspaceId = state.workspace;
  
  const created: string[] = [];
  const existing: string[] = [];
  const errors: Array<{ botId: string; error: string }> = [];
  
  for (const agencyBot of AGENCY_TEAM) {
    // Check if bot already exists
    const existingBot = state.bots.find(
      b => b.id === agencyBot.id || 
           (b.name === agencyBot.name && b.workspaceId === workspaceId)
    );
    
    if (existingBot) {
      existing.push(existingBot.id);
      continue;
    }
    
    // Create bot using Bops' existing bot creation
    const result = await createBot(
      agencyBot.name,
      agencyBot.role,
      workspaceId,
      false // Shared computer
    );
    
    if ('error' in result) {
      errors.push({ botId: agencyBot.id, error: result.error });
    } else {
      created.push(result.botId);
      
      // Store agency bot mapping
      update((s) => {
        if (!s.agencyBotMappings) {
          s.agencyBotMappings = {};
        }
        s.agencyBotMappings[agencyBot.id] = result.botId;
      });
    }
  }
  
  trackServerEvent("installer_agency_bots_seeded", {
    created: created.length,
    existing: existing.length,
    errors: errors.length,
  });
  
  return { created, existing, errors };
}

/**
 * Get actual bot ID for an agency bot ID
 */
export function getAgencyBotId(agencyBotId: string): string | null {
  const state = getState();
  return state.agencyBotMappings?.[agencyBotId] || null;
}

/**
 * Dispatch job to bot
 * Creates a message in the bot's chat to start work on this job
 */
export async function dispatchJobToBot(
  jobId: string,
  botId: string,
  stageName: string
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) throw new Error('Job not found');
  
  const agencyBotId = getAgencyBotId(botId);
  if (!agencyBotId) {
    throw new Error(`Agency bot not found: ${botId}`);
  }
  
  const b = bot(agencyBotId);
  if (!b) throw new Error(`Bot not found: ${agencyBotId}`);
  
  // Create task message for bot
  const taskDescription = formatJobForBot(job, stageName);
  
  // Add message to bot's chat
  // This will trigger the bot to start working on this job
  // The bot's system prompt (from agency-config.ts) will guide its work
  
  // TODO: Wire to Bops' session/task creation
  // For now, log the dispatch
  console.log(`[agency] Dispatching job ${jobId} to bot ${b.name} for stage ${stageName}`);
  console.log(`[agency] Task: ${taskDescription}`);
  
  trackServerEvent("installer_job_dispatched", {
    job_id: jobId,
    bot_id: agencyBotId,
    stage: stageName,
  });
}

/**
 * Format job details for bot task
 */
function formatJobForBot(job: AgencyJob, stageName: string): string {
  return `
**Job: ${job.projectTitle}**

Client: ${job.clientName}
Type: ${job.projectType}
Vertical: ${job.vertical}

**Your Task (${stageName}):**

${formatBriefForStage(job, stageName)}

**Deliverables:**
${job.brief.deliverables.map(d => `- ${d}`).join('\n')}

**Budget:** ${job.budgetCents ? `$${(job.budgetCents / 100).toFixed(2)}` : 'Not specified'}

Job ID: ${job.id}
`.trim();
}

/**
 * Format job brief for specific stage
 */
function formatBriefForStage(job: AgencyJob, stageName: string): string {
  const brief = job.brief;
  
  const parts = [
    `Goals: ${brief.goals}`,
  ];
  
  if (brief.audience) parts.push(`Audience: ${brief.audience}`);
  if (brief.style) parts.push(`Style: ${brief.style}`);
  
  return parts.join('\n');
}

/**
 * Handle bot completion of stage
 * Called when bot finishes its work and hands off
 */
export async function handleStageCompletion(
  jobId: string,
  botId: string,
  outputs?: Array<{ filename: string; url: string; type: string }>
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) throw new Error('Job not found');
  
  // Mark current stage as completed
  await updateStageStatus(jobId, botId, 'completed', outputs || []);
  
  // Find next stage
  const currentIndex = job.workflow.findIndex(s => s.botId === botId);
  const nextStage = job.workflow[currentIndex + 1];
  
  if (nextStage) {
    // Move to next stage
    await updateJobStatus(jobId, job.status, nextStage.botId);
    await updateStageStatus(jobId, nextStage.botId, 'in_progress');
    
    // Dispatch to next bot
    await dispatchJobToBot(jobId, nextStage.botId, nextStage.stageName);
  } else {
    // All stages complete
    await updateJobStatus(jobId, 'completed');
  }
  
  trackServerEvent("installer_stage_completed", {
    job_id: jobId,
    bot_id: botId,
    has_next: !!nextStage,
  });
}

/**
 * Create approval gate in job and surface in bot chat
 * Hooks into Bops' existing approval UI (askFor from permission.ts)
 */
export async function createJobApproval(
  jobId: string,
  botId: string,
  title: string,
  description: string,
  estimatedCost?: number
): Promise<string> {
  const approvalId = await addApprovalGate(jobId, {
    type: estimatedCost ? 'spend' : 'deliverable',
    title,
    description,
    assets: [],
    estimatedCost,
  });
  
  // TODO: Wire to Bops' askFor() to show in chat
  // For now, just log
  console.log(`[agency] Approval gate created: ${title}`);
  console.log(`[agency] Job: ${jobId}, Bot: ${botId}`);
  if (estimatedCost) {
    console.log(`[agency] Estimated cost: $${(estimatedCost / 100).toFixed(2)}`);
  }
  
  trackServerEvent("installer_approval_created", {
    job_id: jobId,
    bot_id: botId,
    type: estimatedCost ? 'spend' : 'deliverable',
    cost_cents: estimatedCost,
  });
  
  return approvalId;
}

/**
 * Check if agency bots are seeded
 */
export function areAgencyBotsSeeded(): boolean {
  const state = getState();
  return Object.keys(state.agencyBotMappings || {}).length === AGENCY_TEAM.length;
}

/**
 * Get all agency bot IDs
 */
export function getAgencyBotIds(): Record<string, string> {
  const state = getState();
  return state.agencyBotMappings || {};
}
