import "server-only";
import type { AgencyJob, JobStatus, StageStatus, ApprovalGate, JobAsset, WorkflowStage } from "@/lib/job-types";
import { getWorkflow } from "@/lib/agency-config";
import { getState } from "./store";
import { trackServerEvent } from "./analytics";

/**
 * Installer.report Job Management (In-Memory)
 * 
 * Simplified in-memory implementation for Phase 3 integration.
 * TODO: Replace with database persistence when ready.
 */

const jobStore = new Map<string, AgencyJob>();

function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function createJob(params: {
  clientName: string;
  clientEmail?: string;
  projectTitle: string;
  projectType: string;
  vertical: string;
  brief: {
    goals: string;
    audience?: string;
    style?: string;
    deliverables: string[];
  };
  budgetCents?: number;
  workspaceId?: string;
}): Promise<AgencyJob> {
  const state = getState();
  const userId = state.account?.user?.id;
  const workspaceId = params.workspaceId || state.workspace;
  
  if (!userId) throw new Error("User not authenticated");
  
  const jobId = generateJobId();
  const now = new Date().toISOString();
  
  const workflowBotIds = getWorkflow(params.projectType);
  const workflow: WorkflowStage[] = workflowBotIds.map((botId, index) => ({
    botId,
    stageName: botId.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" "),
    stageOrder: index,
    status: index === 0 ? "in_progress" : "pending",
    outputs: [],
  }));
  
  const job: AgencyJob = {
    id: jobId,
    userId,
    workspaceId,
    clientName: params.clientName,
    clientEmail: params.clientEmail || '',
    projectTitle: params.projectTitle,
    projectType: params.projectType as any,
    vertical: params.vertical as any,
    brief: {
      goals: params.brief.goals,
      audience: params.brief.audience || '',
      style: params.brief.style,
      deliverables: params.brief.deliverables,
    } as any,
    budgetCents: params.budgetCents,
    status: "intake",
    currentStage: workflowBotIds[0],
    assignedTo: workflowBotIds[0],
    workflow,
    sourceAssets: [],
    deliverables: [],
    approvalGates: [],
    totalCostCents: 0,
    providerUsage: {},
    createdAt: now,
    updatedAt: now,
  };
  
  jobStore.set(job.id, job);
  
  trackServerEvent("bops_job_created" as any, {
    job_id: jobId,
    project_type: params.projectType,
    vertical: params.vertical,
    workflow_stages: workflow.length,
  });
  
  return job;
}

export async function getJob(jobId: string): Promise<AgencyJob | null> {
  return jobStore.get(jobId) || null;
}

export async function listJobs(filters?: {
  status?: string;
  vertical?: string;
  clientName?: string;
}): Promise<AgencyJob[]> {
  let jobs = Array.from(jobStore.values());
  
  if (filters?.status) {
    jobs = jobs.filter(j => j.status === filters.status);
  }
  
  if (filters?.vertical) {
    jobs = jobs.filter(j => j.vertical === filters.vertical);
  }
  
  if (filters?.clientName) {
    const lowerName = filters.clientName.toLowerCase();
    jobs = jobs.filter(j => j.clientName.toLowerCase().includes(lowerName));
  }
  
  return jobs.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  assignedTo?: string
): Promise<void> {
  const job = jobStore.get(jobId);
  if (job) {
    job.status = status;
    if (assignedTo) job.assignedTo = assignedTo;
    job.updatedAt = new Date().toISOString();
    jobStore.set(jobId, job);
  }
}

export async function updateStageStatus(
  jobId: string,
  botId: string,
  status: StageStatus,
  outputs?: JobAsset[]
): Promise<void> {
  const job = jobStore.get(jobId);
  if (job) {
    const stage = job.workflow.find(s => s.botId === botId);
    if (stage) {
      stage.status = status;
      if (outputs) stage.outputs = outputs;
      job.updatedAt = new Date().toISOString();
      jobStore.set(jobId, job);
    }
  }
}

export async function addApprovalGate(
  jobId: string,
  approval: Omit<ApprovalGate, 'id' | 'createdAt'>
): Promise<string> {
  const job = jobStore.get(jobId);
  if (!job) throw new Error('Job not found');
  
  const approvalId = `appr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const gate: ApprovalGate = {
    id: approvalId,
    ...approval,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  
  job.approvalGates.push(gate);
  job.updatedAt = new Date().toISOString();
  jobStore.set(jobId, job);
  
  return approvalId;
}

export async function processApproval(
  approvalId: string,
  approved: boolean,
  feedback?: string
): Promise<void> {
  for (const job of jobStore.values()) {
    const gate = job.approvalGates.find(g => g.id === approvalId);
    if (gate) {
      gate.status = approved ? 'approved' : 'rejected';
      if (feedback) gate.feedback = feedback;
      gate.processedAt = new Date().toISOString();
      job.updatedAt = new Date().toISOString();
      jobStore.set(job.id, job);
      
      trackServerEvent("bops_approval_processed" as any, {
        approval_id: approvalId,
        job_id: job.id,
        approved,
      });
      
      return;
    }
  }
  
  throw new Error('Approval not found');
}

export async function addDeliverable(
  jobId: string,
  deliverable: JobAsset
): Promise<void> {
  const job = jobStore.get(jobId);
  if (!job) throw new Error('Job not found');
  
  job.deliverables.push(deliverable);
  job.updatedAt = new Date().toISOString();
  jobStore.set(jobId, job);
}

export async function trackProviderUsage(
  jobId: string,
  provider: string,
  operation: string,
  costCents: number,
  outputs: string[],
  success: boolean
): Promise<void> {
  const job = jobStore.get(jobId);
  if (!job) throw new Error('Job not found');
  
  job.providerUsage[provider] = (job.providerUsage[provider] || 0) + costCents;
  job.totalCostCents += costCents;
  job.updatedAt = new Date().toISOString();
  jobStore.set(jobId, job);
  
  trackServerEvent("bops_provider_usage" as any, {
    job_id: jobId,
    provider,
    operation,
    cost_cents: costCents,
    success,
  });
}

export async function getPendingApprovals(): Promise<Array<{
  id: string;
  jobId: string;
  type: string;
  title: string;
  description: string;
  estimatedCost?: number;
  createdAt: string;
}>> {
  const approvals: Array<{
    id: string;
    jobId: string;
    type: string;
    title: string;
    description: string;
    estimatedCost?: number;
    createdAt: string;
  }> = [];
  
  for (const job of jobStore.values()) {
    for (const gate of job.approvalGates) {
      if (gate.status === 'pending') {
        approvals.push({
          id: gate.id,
          jobId: job.id,
          type: gate.type,
          title: gate.title,
          description: gate.description || '',
          estimatedCost: gate.estimatedCost,
          createdAt: gate.createdAt,
        });
      }
    }
  }
  
  return approvals.sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export async function completeJob(jobId: string): Promise<void> {
  const job = jobStore.get(jobId);
  if (!job) throw new Error('Job not found');
  
  job.status = 'completed';
  job.completedAt = new Date().toISOString();
  job.updatedAt = new Date().toISOString();
  jobStore.set(jobId, job);
  
  trackServerEvent("bops_job_completed" as any, {
    job_id: jobId,
    total_cost_cents: job.totalCostCents,
    deliverables: job.deliverables.length,
  });
}
