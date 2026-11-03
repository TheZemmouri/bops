import "server-only";
import type { AgencyJob, JobStatus, StageStatus, ApprovalGate, JobAsset } from "@/lib/job-types";
import { getWorkflow } from "@/lib/agency-config";
import { getState } from "./store";
import { trackServerEvent } from "./analytics";
import { query } from "./db";

/**
 * Installer.report Job Management (Database-backed)
 * 
 * Full database persistence using Bops Postgres connection.
 * Migration: db/migrations/0019_agency_jobs.sql
 */

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
  const workflow = workflowBotIds.map((botId, index) => ({
    botId,
    stageName: botId.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" "),
    stageOrder: index,
    status: index === 0 ? "in_progress" as const : "pending" as const,
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
    brief: params.brief as any,
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
  
  // Insert into database
  await query(
    `INSERT INTO bops.agency_jobs (
      id, user_id, workspace_id, client_name, client_email,
      project_title, project_type, vertical, brief, budget_cents,
      status, current_stage, assigned_to, workflow,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
    [
      job.id, job.userId, job.workspaceId, job.clientName, job.clientEmail,
      job.projectTitle, job.projectType, job.vertical, JSON.stringify(job.brief), job.budgetCents,
      job.status, job.currentStage, job.assignedTo, JSON.stringify(job.workflow),
      job.createdAt, job.updatedAt
    ]
  );
  
  trackServerEvent("bops_job_created" as any, {
    job_id: jobId,
    project_type: params.projectType,
    vertical: params.vertical,
    workflow_stages: workflow.length,
  });
  
  return job;
}

export async function getJob(jobId: string): Promise<AgencyJob | null> {
  const result = await query<any>(
    `SELECT * FROM bops.agency_jobs WHERE id = $1`,
    [jobId]
  );
  
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    clientName: row.client_name,
    clientEmail: row.client_email,
    projectTitle: row.project_title,
    projectType: row.project_type,
    vertical: row.vertical,
    brief: row.brief,
    budgetCents: row.budget_cents,
    timeline: row.timeline,
    status: row.status,
    currentStage: row.current_stage,
    assignedTo: row.assigned_to,
    workflow: row.workflow,
    sourceAssets: row.source_assets || [],
    deliverables: row.deliverables || [],
    approvalGates: row.approval_gates || [],
    totalCostCents: Number(row.total_cost_cents) || 0,
    providerUsage: row.provider_usage || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    notes: row.notes,
  };
}

export async function listJobs(filters?: {
  status?: string;
  vertical?: string;
  clientName?: string;
}): Promise<AgencyJob[]> {
  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;
  
  if (filters?.status) {
    whereClause += ` AND status = $${paramIndex++}`;
    params.push(filters.status);
  }
  
  if (filters?.vertical) {
    whereClause += ` AND vertical = $${paramIndex++}`;
    params.push(filters.vertical);
  }
  
  if (filters?.clientName) {
    whereClause += ` AND LOWER(client_name) LIKE LOWER($${paramIndex++})`;
    params.push(`%${filters.clientName}%`);
  }
  
  const result = await query<any>(
    `SELECT * FROM bops.agency_jobs ${whereClause} ORDER BY created_at DESC`,
    params
  );
  
  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    clientName: row.client_name,
    clientEmail: row.client_email,
    projectTitle: row.project_title,
    projectType: row.project_type,
    vertical: row.vertical,
    brief: row.brief,
    budgetCents: row.budget_cents,
    timeline: row.timeline,
    status: row.status,
    currentStage: row.current_stage,
    assignedTo: row.assigned_to,
    workflow: row.workflow,
    sourceAssets: row.source_assets || [],
    deliverables: row.deliverables || [],
    approvalGates: row.approval_gates || [],
    totalCostCents: Number(row.total_cost_cents) || 0,
    providerUsage: row.provider_usage || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    notes: row.notes,
  }));
}

export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  assignedTo?: string
): Promise<void> {
  await query(
    `UPDATE bops.agency_jobs 
     SET status = $1, assigned_to = COALESCE($2, assigned_to), updated_at = NOW()
     WHERE id = $3`,
    [status, assignedTo, jobId]
  );
}

export async function updateStageStatus(
  jobId: string,
  botId: string,
  status: StageStatus,
  outputs?: JobAsset[]
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) throw new Error('Job not found');
  
  const workflow = job.workflow.map(stage => 
    stage.botId === botId 
      ? { ...stage, status, ...(outputs ? { outputs } : {}) }
      : stage
  );
  
  await query(
    `UPDATE bops.agency_jobs 
     SET workflow = $1, updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(workflow), jobId]
  );
}

export async function addApprovalGate(
  jobId: string,
  approval: Omit<ApprovalGate, 'id' | 'createdAt'>
): Promise<string> {
  const job = await getJob(jobId);
  if (!job) throw new Error('Job not found');
  
  const approvalId = `appr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const gate: ApprovalGate = {
    id: approvalId,
    ...approval,
    createdAt: new Date().toISOString(),
  };
  
  const approvalGates = [...job.approvalGates, gate];
  
  await query(
    `UPDATE bops.agency_jobs 
     SET approval_gates = $1, updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(approvalGates), jobId]
  );
  
  return approvalId;
}

export async function processApproval(
  approvalId: string,
  approved: boolean,
  feedback?: string
): Promise<void> {
  const jobs = await listJobs();
  
  for (const job of jobs) {
    const gate = job.approvalGates.find(g => g.id === approvalId);
    if (gate) {
      gate.status = approved ? 'approved' : 'rejected';
      if (feedback) gate.feedback = feedback;
      gate.processedAt = new Date().toISOString();
      
      await query(
        `UPDATE bops.agency_jobs 
         SET approval_gates = $1, updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(job.approvalGates), job.id]
      );
      
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
  const job = await getJob(jobId);
  if (!job) throw new Error('Job not found');
  
  const deliverables = [...job.deliverables, deliverable];
  
  await query(
    `UPDATE bops.agency_jobs 
     SET deliverables = $1, updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(deliverables), jobId]
  );
}

export async function trackProviderUsage(
  jobId: string,
  provider: string,
  operation: string,
  costCents: number,
  outputs: string[],
  success: boolean
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) throw new Error('Job not found');
  
  const providerUsage = { ...job.providerUsage };
  providerUsage[provider] = (providerUsage[provider] || 0) + costCents;
  
  const totalCostCents = job.totalCostCents + costCents;
  
  await query(
    `UPDATE bops.agency_jobs 
     SET provider_usage = $1, total_cost_cents = $2, updated_at = NOW()
     WHERE id = $3`,
    [JSON.stringify(providerUsage), totalCostCents, jobId]
  );
  
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
  const jobs = await listJobs();
  const approvals: Array<{
    id: string;
    jobId: string;
    type: string;
    title: string;
    description: string;
    estimatedCost?: number;
    createdAt: string;
  }> = [];
  
  for (const job of jobs) {
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
  await query(
    `UPDATE bops.agency_jobs 
     SET status = 'completed', completed_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [jobId]
  );
  
  const job = await getJob(jobId);
  
  trackServerEvent("bops_job_completed" as any, {
    job_id: jobId,
    total_cost_cents: job?.totalCostCents || 0,
    deliverables: job?.deliverables.length || 0,
  });
}
