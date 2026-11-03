import "server-only";
import type { AgencyJob, JobStatus, StageStatus, ApprovalGate, JobAsset, WorkflowStage } from "@/lib/job-types";
import { getWorkflow } from "@/lib/agency-config";
import { getState, update } from "./store";
import { trackServerEvent } from "./analytics";

/**
 * Installer.report Job Management
 * 
 * Handles job lifecycle, workflow execution, approval gates, and deliverables.
 */

const JOB_ID_PREFIX = "job_";

/**
 * Generate a unique job ID
 */
function generateJobId(): string {
  return `${JOB_ID_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Get database connection (uses Bops persist layer)
 */
async function getDb() {
  const { getPersist } = await import("./persist");
  return getPersist();
}

/**
 * Create a new job
 */
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
    [key: string]: unknown;
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
  
  // Get workflow for this project type
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
    clientEmail: params.clientEmail,
    projectTitle: params.projectTitle,
    projectType: params.projectType,
    vertical: params.vertical,
    brief: params.brief,
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
  
  // Store in database if available
  const db = await getDb();
  if (db.type === "postgres") {
    await db.query(
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
  }
  
  // Track job creation
  trackServerEvent("installer_job_created", {
    job_id: jobId,
    project_type: params.projectType,
    vertical: params.vertical,
    workflow_stages: workflow.length,
  });
  
  return job;
}

/**
 * Get job by ID
 */
export async function getJob(jobId: string): Promise<AgencyJob | null> {
  const db = await getDb();
  
  if (db.type === "postgres") {
    const result = await db.query(
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
  
  return null;
}

/**
 * List jobs for current user
 */
export async function listJobs(params: {
  userId?: string;
  workspaceId?: string;
  status?: JobStatus;
  vertical?: string;
  limit?: number;
  offset?: number;
}): Promise<{ jobs: AgencyJob[]; total: number }> {
  const state = getState();
  const userId = params.userId || state.account?.user?.id;
  const workspaceId = params.workspaceId || state.workspace;
  
  if (!userId) return { jobs: [], total: 0 };
  
  const db = await getDb();
  
  if (db.type === "postgres") {
    const conditions = ["user_id = $1", "workspace_id = $2"];
    const values: unknown[] = [userId, workspaceId];
    let paramIndex = 3;
    
    if (params.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(params.status);
    }
    
    if (params.vertical) {
      conditions.push(`vertical = $${paramIndex++}`);
      values.push(params.vertical);
    }
    
    const whereClause = conditions.join(" AND ");
    
    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) FROM bops.agency_jobs WHERE ${whereClause}`,
      values
    );
    const total = Number(countResult.rows[0].count);
    
    // Get jobs
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    
    const result = await db.query(
      `SELECT * FROM bops.agency_jobs WHERE ${whereClause}
       ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );
    
    const jobs = result.rows.map((row): AgencyJob => ({
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
    
    return { jobs, total };
  }
  
  return { jobs: [], total: 0 };
}

/**
 * Update job status and current stage
 */
export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  currentStage?: string
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  
  if (db.type === "postgres") {
    const updates: string[] = ["status = $2", "updated_at = $3"];
    const values: unknown[] = [jobId, status, now];
    let paramIndex = 4;
    
    if (currentStage) {
      updates.push(`current_stage = $${paramIndex++}`);
      values.push(currentStage);
    }
    
    if (status === "completed") {
      updates.push(`completed_at = $${paramIndex++}`);
      values.push(now);
    }
    
    await db.query(
      `UPDATE bops.agency_jobs SET ${updates.join(", ")} WHERE id = $1`,
      values
    );
  }
}

/**
 * Update workflow stage status
 */
export async function updateStageStatus(
  jobId: string,
  botId: string,
  status: StageStatus,
  outputs?: JobAsset[]
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) throw new Error("Job not found");
  
  const workflow = job.workflow.map(stage => {
    if (stage.botId === botId) {
      return { ...stage, status, outputs: outputs || stage.outputs };
    }
    return stage;
  });
  
  const db = await getDb();
  if (db.type === "postgres") {
    await db.query(
      `UPDATE bops.agency_jobs SET workflow = $2, updated_at = $3 WHERE id = $1`,
      [jobId, JSON.stringify(workflow), new Date().toISOString()]
    );
  }
}

/**
 * Add approval gate
 */
export async function addApprovalGate(
  jobId: string,
  approval: Omit<ApprovalGate, "id" | "status">
): Promise<string> {
  const approvalId = `appr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const gate: ApprovalGate = {
    id: approvalId,
    ...approval,
    status: "pending",
  };
  
  const db = await getDb();
  if (db.type === "postgres") {
    await db.query(
      `INSERT INTO bops.agency_approvals (
        id, job_id, approval_type, title, description, assets,
        estimated_cost, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        approvalId, jobId, approval.type, approval.title,
        approval.description, JSON.stringify(approval.assets),
        approval.estimatedCost, "pending", new Date().toISOString()
      ]
    );
  }
  
  return approvalId;
}

/**
 * Process approval response
 */
export async function processApproval(
  approvalId: string,
  approved: boolean,
  feedback?: string
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  
  if (db.type === "postgres") {
    await db.query(
      `UPDATE bops.agency_approvals
       SET status = $2, approved_at = $3, feedback = $4
       WHERE id = $1`,
      [approvalId, approved ? "approved" : "rejected", now, feedback]
    );
  }
  
  trackServerEvent("installer_approval_processed", {
    approval_id: approvalId,
    approved,
    has_feedback: !!feedback,
  });
}

/**
 * Add asset to job deliverables
 */
export async function addDeliverable(
  jobId: string,
  asset: JobAsset
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) throw new Error("Job not found");
  
  const deliverables = [...job.deliverables, asset];
  
  const db = await getDb();
  if (db.type === "postgres") {
    await db.query(
      `UPDATE bops.agency_jobs SET deliverables = $2, updated_at = $3 WHERE id = $1`,
      [jobId, JSON.stringify(deliverables), new Date().toISOString()]
    );
  }
}

/**
 * Track provider usage and cost
 */
export async function trackProviderUsage(
  jobId: string,
  provider: string,
  operation: string,
  costCents: number,
  outputs: string[],
  success: boolean,
  error?: string
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) throw new Error("Job not found");
  
  // Update job totals
  const totalCostCents = job.totalCostCents + costCents;
  const providerUsage = {
    ...job.providerUsage,
    [provider]: (job.providerUsage[provider] || 0) + costCents,
  };
  
  const db = await getDb();
  if (db.type === "postgres") {
    // Update job totals
    await db.query(
      `UPDATE bops.agency_jobs
       SET total_cost_cents = $2, provider_usage = $3, updated_at = $4
       WHERE id = $1`,
      [jobId, totalCostCents, JSON.stringify(providerUsage), new Date().toISOString()]
    );
    
    // Record usage detail
    await db.query(
      `INSERT INTO bops.agency_provider_usage (
        job_id, provider, operation, cost_cents, output_urls, success, error, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [jobId, provider, operation, costCents, JSON.stringify(outputs), success, error, new Date().toISOString()]
    );
  }
  
  trackServerEvent("installer_provider_usage", {
    job_id: jobId,
    provider,
    operation,
    cost_cents: costCents,
    success,
  });
}

/**
 * Get pending approvals for a job
 */
export async function getPendingApprovals(jobId: string): Promise<ApprovalGate[]> {
  const db = await getDb();
  
  if (db.type === "postgres") {
    const result = await db.query(
      `SELECT * FROM bops.agency_approvals WHERE job_id = $1 AND status = 'pending'`,
      [jobId]
    );
    
    return result.rows.map(row => ({
      id: row.id,
      type: row.approval_type,
      title: row.title,
      description: row.description,
      assets: row.assets || [],
      estimatedCost: row.estimated_cost,
      status: row.status,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      feedback: row.feedback,
      expiresAt: row.expires_at,
    }));
  }
  
  return [];
}

/**
 * Complete a job
 */
export async function completeJob(jobId: string): Promise<void> {
  await updateJobStatus(jobId, "completed");
  
  trackServerEvent("installer_job_completed", { job_id: jobId });
}
