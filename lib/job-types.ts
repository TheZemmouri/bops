/**
 * Installer.report Job Pipeline Types
 * 
 * Type definitions for the agency job workflow, client portal,
 * and provider integrations.
 */

export type JobStatus = 
  | 'intake'      // Initial brief collection
  | 'strategy'    // Creative strategy development
  | 'production'  // Active production
  | 'review'      // Client review
  | 'delivery'    // Final delivery
  | 'completed'   // Project completed
  | 'cancelled';  // Cancelled

export type StageStatus =
  | 'pending'      // Not started
  | 'in_progress'  // Currently working
  | 'review'       // Awaiting internal review
  | 'approved'     // Approved to proceed
  | 'completed'    // Stage finished
  | 'skipped';     // Skipped this stage

export type ApprovalStatus =
  | 'pending'   // Awaiting approval
  | 'approved'  // Approved by client
  | 'rejected'  // Rejected, needs revision
  | 'expired';  // Approval request expired

export type ProjectType =
  | 'commercial'
  | 'restyle'
  | 'social_cutdowns'
  | 'trailer'
  | 'music_video'
  | 'brand_film'
  | 'product_video'
  | 'custom';

export type Vertical =
  | 'brand'
  | 'real_estate'
  | 'auto'
  | 'music'
  | 'film'
  | 'creator'
  | 'ecommerce';

export type ApprovalType =
  | 'strategy'      // Creative strategy approval
  | 'creative'      // Creative concept/script approval
  | 'deliverable'   // Final deliverable approval
  | 'spend'         // Budget/spend approval
  | 'publication';  // Publish/distribution approval

export interface JobBrief {
  goals: string;
  audience: string;
  style?: string;
  tone?: string;
  references?: string[]; // URLs or file references
  deliverables: string[];
  platforms?: string[];
  customRequirements?: string;
}

export interface JobTimeline {
  requestedDelivery?: string; // ISO date
  milestones?: Array<{
    name: string;
    date: string;
    description?: string;
  }>;
}

export interface WorkflowStage {
  botId: string;
  stageName: string;
  stageOrder: number;
  status: StageStatus;
  outputs?: JobAsset[];
  notes?: string;
  estimatedDuration?: string; // e.g. "2 hours", "1 day"
}

export interface JobAsset {
  id: string;
  filename: string;
  type: 'video' | 'image' | 'audio' | 'document' | 'other';
  url: string;
  size?: number;
  mimeType?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ApprovalGate {
  id: string;
  type: ApprovalType;
  title: string;
  description?: string;
  assets: JobAsset[];
  estimatedCost?: number; // cents
  status: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  feedback?: string;
  expiresAt?: string;
}

export interface ProviderUsageRecord {
  provider: string;
  operation: string;
  costCents: number;
  units?: string;
  quantity?: number;
  success: boolean;
  error?: string;
  timestamp: string;
}

export interface AgencyJob {
  id: string;
  userId: string;
  workspaceId: string;
  
  // Client info
  clientName: string;
  clientEmail?: string;
  
  // Project
  projectTitle: string;
  projectType: ProjectType;
  vertical: Vertical;
  
  // Brief
  brief: JobBrief;
  budgetCents?: number;
  timeline?: JobTimeline;
  
  // Status
  status: JobStatus;
  currentStage?: string; // bot ID
  assignedTo?: string;   // bot ID
  
  // Workflow
  workflow: WorkflowStage[];
  
  // Assets
  sourceAssets: JobAsset[];
  deliverables: JobAsset[];
  
  // Approvals
  approvalGates: ApprovalGate[];
  
  // Costs
  totalCostCents: number;
  providerUsage: Record<string, number>; // provider -> cost
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  notes?: string;
}

export interface ClientPortalAccess {
  id: string;
  jobId: string;
  shareToken: string;
  clientEmail: string;
  canApprove: boolean;
  canComment: boolean;
  active: boolean;
  accessedAt?: string;
  expiresAt?: string;
}

/**
 * Client portal view: simplified job data for client access
 */
export interface ClientJobView {
  job: Pick<AgencyJob, 
    | 'id' 
    | 'projectTitle' 
    | 'projectType' 
    | 'status' 
    | 'timeline' 
    | 'workflow'
    | 'deliverables'
    | 'createdAt'
    | 'updatedAt'
  >;
  pendingApprovals: ApprovalGate[];
  recentActivity: Array<{
    timestamp: string;
    botId: string;
    botName: string;
    action: string;
    description: string;
  }>;
  access: ClientPortalAccess;
}
