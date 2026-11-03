-- Installer.report job pipeline
-- Jobs track client projects through the agency workflow
-- Safe to run again

BEGIN;

-- Jobs: client projects moving through the agency
CREATE TABLE IF NOT EXISTS bops.agency_jobs (
  id              text PRIMARY KEY,
  user_id         text NOT NULL,
  workspace_id    text NOT NULL,
  
  -- Client & project info
  client_name     text NOT NULL,
  client_email    text,
  project_title   text NOT NULL,
  project_type    text NOT NULL, -- 'commercial', 'restyle', 'social_cutdowns', 'trailer', 'custom'
  vertical        text NOT NULL, -- 'brand', 'real_estate', 'auto', 'music', 'film', 'creator', 'ecommerce'
  
  -- Brief & requirements
  brief           jsonb NOT NULL, -- { goals, audience, style, references, deliverables, etc. }
  budget_cents    bigint,
  timeline        jsonb, -- { requested_delivery, milestones }
  
  -- Status tracking
  status          text NOT NULL DEFAULT 'intake', -- 'intake', 'strategy', 'production', 'review', 'delivery', 'completed', 'cancelled'
  current_stage   text, -- Which workflow stage (bot ID)
  assigned_to     text, -- Current bot working on it
  
  -- Workflow
  workflow        jsonb NOT NULL DEFAULT '[]'::jsonb, -- Array of stage objects
  
  -- Assets & deliverables
  source_assets   jsonb DEFAULT '[]'::jsonb, -- Input files
  deliverables    jsonb DEFAULT '[]'::jsonb, -- Output files
  
  -- Approvals
  approval_gates  jsonb DEFAULT '[]'::jsonb, -- Approval checkpoints
  
  -- Costs & usage
  total_cost_cents bigint DEFAULT 0,
  provider_usage  jsonb DEFAULT '{}'::jsonb, -- Cost per provider
  
  -- Metadata
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  
  -- Internal notes
  notes           text
);

CREATE INDEX IF NOT EXISTS agency_jobs_user_id ON bops.agency_jobs (user_id);
CREATE INDEX IF NOT EXISTS agency_jobs_workspace_id ON bops.agency_jobs (workspace_id);
CREATE INDEX IF NOT EXISTS agency_jobs_status ON bops.agency_jobs (status);
CREATE INDEX IF NOT EXISTS agency_jobs_created_at ON bops.agency_jobs (created_at DESC);

-- Job workflow stages: each step through the process
CREATE TABLE IF NOT EXISTS bops.agency_job_stages (
  id              bigserial PRIMARY KEY,
  job_id          text NOT NULL REFERENCES bops.agency_jobs(id) ON DELETE CASCADE,
  
  -- Stage info
  bot_id          text NOT NULL, -- Which agency bot handles this
  stage_name      text NOT NULL, -- Human-readable name
  stage_order     integer NOT NULL, -- Sequence in workflow
  
  -- Status
  status          text NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'review', 'approved', 'completed', 'skipped'
  
  -- Outputs
  outputs         jsonb DEFAULT '[]'::jsonb, -- Files/assets produced
  notes           text,
  
  -- Timing
  started_at      timestamptz,
  completed_at    timestamptz,
  
  -- Linked to session/thread
  session_id      text,
  
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agency_job_stages_job_id ON bops.agency_job_stages (job_id);
CREATE INDEX IF NOT EXISTS agency_job_stages_status ON bops.agency_job_stages (status);

-- Approval gates: checkpoints requiring client approval
CREATE TABLE IF NOT EXISTS bops.agency_approvals (
  id              bigserial PRIMARY KEY,
  job_id          text NOT NULL REFERENCES bops.agency_jobs(id) ON DELETE CASCADE,
  stage_id        bigint REFERENCES bops.agency_job_stages(id) ON DELETE SET NULL,
  
  -- What needs approval
  approval_type   text NOT NULL, -- 'strategy', 'creative', 'deliverable', 'spend', 'publication'
  title           text NOT NULL,
  description     text,
  
  -- What's being approved
  assets          jsonb DEFAULT '[]'::jsonb, -- Files to review
  estimated_cost  bigint, -- If it's a spend approval
  
  -- Status
  status          text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'expired'
  
  -- Response
  approved_by     text, -- User who approved
  approved_at     timestamptz,
  feedback        text, -- Client feedback/changes requested
  
  -- Metadata
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz -- Optional expiration
);

CREATE INDEX IF NOT EXISTS agency_approvals_job_id ON bops.agency_approvals (job_id);
CREATE INDEX IF NOT EXISTS agency_approvals_status ON bops.agency_approvals (status);

-- Provider adapter usage: track generation costs per job
CREATE TABLE IF NOT EXISTS bops.agency_provider_usage (
  id              bigserial PRIMARY KEY,
  job_id          text NOT NULL REFERENCES bops.agency_jobs(id) ON DELETE CASCADE,
  stage_id        bigint REFERENCES bops.agency_job_stages(id) ON DELETE SET NULL,
  
  -- Provider
  provider        text NOT NULL, -- 'higgsfield', 'krea', 'runway', 'luma', 'kling', 'elevenlabs'
  
  -- Operation
  operation       text NOT NULL, -- 'generate_video', 'style_transfer', 'upscale', etc.
  parameters      jsonb, -- What was requested
  
  -- Cost
  cost_cents      bigint NOT NULL,
  units           text, -- 'credits', 'seconds', 'frames', etc.
  quantity        numeric,
  
  -- Result
  output_urls     jsonb DEFAULT '[]'::jsonb,
  success         boolean NOT NULL DEFAULT true,
  error           text,
  
  -- Metadata
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agency_provider_usage_job_id ON bops.agency_provider_usage (job_id);
CREATE INDEX IF NOT EXISTS agency_provider_usage_provider ON bops.agency_provider_usage (provider);

-- Client portal access: share job status with clients
CREATE TABLE IF NOT EXISTS bops.agency_client_access (
  id              text PRIMARY KEY,
  job_id          text NOT NULL REFERENCES bops.agency_jobs(id) ON DELETE CASCADE,
  
  -- Access
  share_token     text NOT NULL UNIQUE, -- URL token for client access
  client_email    text NOT NULL,
  
  -- Permissions
  can_approve     boolean NOT NULL DEFAULT true,
  can_comment     boolean NOT NULL DEFAULT true,
  
  -- Status
  active          boolean NOT NULL DEFAULT true,
  accessed_at     timestamptz, -- Last accessed
  
  -- Metadata
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz
);

CREATE INDEX IF NOT EXISTS agency_client_access_job_id ON bops.agency_client_access (job_id);
CREATE INDEX IF NOT EXISTS agency_client_access_token ON bops.agency_client_access (share_token);

INSERT INTO bops.schema_migrations (version) VALUES ('0019_agency_jobs') ON CONFLICT DO NOTHING;

COMMIT;
