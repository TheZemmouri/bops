import "server-only";
import { createBot } from "./bots";
import { getState, update, addMessage } from "./store";
import { botChatId } from "@/lib/types";
import { AGENCY_TEAM } from "@/lib/agency-config";
import { getJob, updateJobStatus, updateStageStatus, addApprovalGate, processApproval } from "./jobs";
import type { AgencyJob } from "@/lib/job-types";
import { trackServerEvent } from "./analytics";
import { askFor, type AskSpec } from "./permission";

/**
 * Installer.report Agency Integration
 * 
 * Wires jobs and workflows into Bops' existing bot system:
 * - Seeds agency bots
 * - Dispatches jobs as real bot chat messages
 * - Hooks approval gates into Bops' approval UI
 * - Advances workflow stages on bot completion
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
      // Store mapping
      update((s) => {
        if (!s.agencyBotMappings) {
          s.agencyBotMappings = {};
        }
        s.agencyBotMappings[agencyBot.id] = existingBot.id;
      });
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
  
  trackServerEvent("bops_agency_bots_seeded" as any, {
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
 * Dispatch job to bot by posting a real message to its chat
 * This triggers the bot to actually work on the job
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
  
  const state = getState();
  const b = state.bots.find(bot => bot.id === agencyBotId);
  if (!b) throw new Error(`Bot not found: ${agencyBotId}`);
  
  const chatId = botChatId(agencyBotId);
  
  // Format task for bot
  const taskMessage = formatJobTaskMessage(job, stageName);
  
  // Post message to bot's chat (triggers bot to work)
  addMessage({
    chatId,
    from: 'user' as const,
    text: taskMessage,
  } as any);
  
  console.log(`[agency] Dispatched job ${jobId} to bot ${b.name} (${chatId}) for stage ${stageName}`);
  
  trackServerEvent("bops_job_dispatched" as any, {
    job_id: jobId,
    bot_id: agencyBotId,
    stage: stageName,
  });
}

/**
 * Format job details as a task message for the bot
 */
function formatJobTaskMessage(job: AgencyJob, stageName: string): string {
  const parts = [
    `# New Job: ${job.projectTitle}`,
    ``,
    `**Client:** ${job.clientName}`,
    `**Type:** ${job.projectType}`,
    `**Vertical:** ${job.vertical}`,
    ``,
    `## Your Task: ${stageName}`,
    ``,
    `**Goals:**`,
    job.brief.goals,
    ``,
  ];
  
  if (job.brief.audience) {
    parts.push(`**Audience:** ${job.brief.audience}`, ``);
  }
  
  if (job.brief.style) {
    parts.push(`**Style:** ${job.brief.style}`, ``);
  }
  
  parts.push(
    `**Deliverables:**`,
    ...job.brief.deliverables.map((d: string) => `- ${d}`),
    ``
  );
  
  if (job.budgetCents) {
    parts.push(`**Budget:** $${(job.budgetCents / 100).toFixed(2)}`, ``);
  }
  
  parts.push(
    `---`,
    `Job ID: ${job.id}`,
    `Stage: ${stageName}`
  );
  
  return parts.join('\n');
}

/**
 * Handle bot completion of stage
 * Detects when bot completes and advances to next stage
 */
export async function handleStageCompletion(
  jobId: string,
  botId: string,
  outputs?: Array<{ filename: string; url: string; type: string }>
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) throw new Error('Job not found');
  
  // Mark current stage as completed
  await updateStageStatus(jobId, botId, 'completed', outputs as any);
  
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
  
  trackServerEvent("bops_stage_completed" as any, {
    job_id: jobId,
    bot_id: botId,
    has_next: !!nextStage,
  });
}

/**
 * Create approval gate and route through Bops' askFor() UI
 * Returns the approval ID and pauses execution
 */
export async function createJobApproval(
  jobId: string,
  botId: string,
  title: string,
  description: string,
  estimatedCost?: number
): Promise<string> {
  const agencyBotId = getAgencyBotId(botId);
  if (!agencyBotId) {
    throw new Error(`Agency bot not found: ${botId}`);
  }
  
  // Create approval gate in job
  const approvalId = await addApprovalGate(jobId, {
    type: estimatedCost ? 'spend' : 'deliverable',
    title,
    description,
    status: 'pending',
    assets: [],
    estimatedCost,
  });
  
  // Create Bops approval request (shows in UI)
  const askSpec: AskSpec = {
    action: title,
    resources: [description],
    preview: estimatedCost ? `Cost: $${(estimatedCost / 100).toFixed(2)}` : undefined,
    kind: estimatedCost ? 'data' : undefined,
  };
  
  const chatId = botChatId(agencyBotId);
  
  // Route through Bops' approval system
  const approval = askFor(
    askSpec,
    { botId: agencyBotId, chatId },
    {
      type: 'approval',
      approvalId,
      jobId,
    } as any
  );
  
  console.log(`[agency] Approval gate created: ${title}`);
  console.log(`[agency] Job: ${jobId}, Bot: ${botId}, Approval: ${approval.id}`);
  
  trackServerEvent("bops_approval_created" as any, {
    job_id: jobId,
    bot_id: agencyBotId,
    type: estimatedCost ? 'spend' : 'deliverable',
    cost_cents: estimatedCost,
  });
  
  return approvalId;
}

/**
 * Handle approval response from Bops UI
 * Resumes job workflow after user approves/rejects
 */
export async function handleApprovalResponse(
  approvalId: string,
  approved: boolean,
  feedback?: string
): Promise<void> {
  await processApproval(approvalId, approved, feedback);
  
  // Find job and resume workflow if approved
  if (approved) {
    // TODO: Resume bot execution
    // For now, just log
    console.log(`[agency] Approval ${approvalId} approved, resuming workflow`);
  } else {
    console.log(`[agency] Approval ${approvalId} rejected: ${feedback || 'No feedback'}`);
  }
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
