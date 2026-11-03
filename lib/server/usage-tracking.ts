import "server-only";
import { getState, update, bot } from "./store";
import { workspaceOf } from "@/lib/types";

/**
 * Usage and cost tracking for bots and workspaces.
 * Tracks tokens, API calls, and estimated costs per bot and workspace.
 */

export type UsageRecord = {
  botId: string;
  workspaceId: string;
  timestamp: number;
  tokenCount: number;
  estimatedCost: number; // in USD cents
  model?: string;
  operation: "chat" | "task" | "routine" | "call" | "other";
};

export type UsageLimits = {
  /** Maximum tokens per day per bot (0 = unlimited) */
  tokensPerBotPerDay?: number;
  /** Maximum cost per day per bot in USD cents (0 = unlimited) */
  costPerBotPerDay?: number;
  /** Maximum tokens per day per workspace (0 = unlimited) */
  tokensPerWorkspacePerDay?: number;
  /** Maximum cost per day per workspace in USD cents (0 = unlimited) */
  costPerWorkspacePerDay?: number;
  /** Alert threshold (0-1, e.g. 0.8 for 80%) */
  alertThreshold?: number;
};

export type UsageAlert = {
  id: string;
  botId?: string;
  workspaceId: string;
  type: "cost" | "tokens";
  threshold: number;
  current: number;
  limit: number;
  timestamp: number;
  dismissed?: boolean;
};

/**
 * Rough cost estimates per 1M tokens (as of late 2024, subject to change)
 * Update these based on current pricing
 */
const MODEL_COSTS = {
  "gpt-4": { input: 3000, output: 6000 }, // $30 per 1M input, $60 per 1M output
  "gpt-4-turbo": { input: 1000, output: 3000 },
  "gpt-3.5-turbo": { input: 50, output: 150 },
  "claude-3-opus": { input: 1500, output: 7500 },
  "claude-3-sonnet": { input: 300, output: 1500 },
  default: { input: 500, output: 1500 }, // Conservative default
};

/**
 * Estimate cost in USD cents based on tokens and model
 */
export function estimateCost(tokens: number, model?: string, isOutput = false): number {
  const modelKey = model?.toLowerCase().includes("gpt-4-turbo")
    ? "gpt-4-turbo"
    : model?.toLowerCase().includes("gpt-4")
    ? "gpt-4"
    : model?.toLowerCase().includes("gpt-3.5")
    ? "gpt-3.5-turbo"
    : model?.toLowerCase().includes("claude-3-opus")
    ? "claude-3-opus"
    : model?.toLowerCase().includes("claude-3-sonnet")
    ? "claude-3-sonnet"
    : "default";

  const costs = MODEL_COSTS[modelKey] || MODEL_COSTS.default;
  const costPer1M = isOutput ? costs.output : costs.input;
  
  // Convert to cents: (tokens / 1M) * costPer1M
  return Math.ceil((tokens / 1_000_000) * costPer1M);
}

/**
 * Record usage for a bot
 */
export function recordUsage(
  botId: string,
  tokens: number,
  model?: string,
  operation: UsageRecord["operation"] = "other"
) {
  const b = bot(botId);
  if (!b) return;

  const workspaceId = workspaceOf(b);
  const estimatedCost = estimateCost(tokens, model);

  const record: UsageRecord = {
    botId,
    workspaceId,
    timestamp: Date.now(),
    tokenCount: tokens,
    estimatedCost,
    model,
    operation,
  };

  update((state) => {
    if (!state.usageRecords) state.usageRecords = [];
    state.usageRecords.push(record);

    // Keep only last 7 days of records
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    state.usageRecords = state.usageRecords.filter((r) => r.timestamp > cutoff);
  });

  // Check limits after recording
  void checkLimits(botId, workspaceId);
}

/**
 * Get usage summary for a bot (today)
 */
export function getBotUsageToday(botId: string): {
  tokens: number;
  cost: number;
  operations: number;
} {
  const state = getState();
  const startOfDay = new Date().setHours(0, 0, 0, 0);

  const records = (state.usageRecords || []).filter(
    (r) => r.botId === botId && r.timestamp >= startOfDay
  );

  return {
    tokens: records.reduce((sum, r) => sum + r.tokenCount, 0),
    cost: records.reduce((sum, r) => sum + r.estimatedCost, 0),
    operations: records.length,
  };
}

/**
 * Get usage summary for a workspace (today)
 */
export function getWorkspaceUsageToday(workspaceId: string): {
  tokens: number;
  cost: number;
  operations: number;
  byBot: Record<string, { tokens: number; cost: number; operations: number }>;
} {
  const state = getState();
  const startOfDay = new Date().setHours(0, 0, 0, 0);

  const records = (state.usageRecords || []).filter(
    (r) => r.workspaceId === workspaceId && r.timestamp >= startOfDay
  );

  const byBot: Record<string, { tokens: number; cost: number; operations: number }> = {};

  for (const record of records) {
    if (!byBot[record.botId]) {
      byBot[record.botId] = { tokens: 0, cost: 0, operations: 0 };
    }
    byBot[record.botId].tokens += record.tokenCount;
    byBot[record.botId].cost += record.estimatedCost;
    byBot[record.botId].operations += 1;
  }

  return {
    tokens: records.reduce((sum, r) => sum + r.tokenCount, 0),
    cost: records.reduce((sum, r) => sum + r.estimatedCost, 0),
    operations: records.length,
    byBot,
  };
}

/**
 * Get usage limits for a workspace
 */
export function getUsageLimits(workspaceId?: string): UsageLimits {
  const state = getState();
  const ws = workspaceId
    ? state.workspaces?.find((w) => w.id === workspaceId)
    : state.workspaces?.[0];

  return ws?.usageLimits || {};
}

/**
 * Set usage limits for a workspace
 */
export function setUsageLimits(workspaceId: string, limits: UsageLimits) {
  update((state) => {
    const ws = state.workspaces?.find((w) => w.id === workspaceId);
    if (ws) {
      ws.usageLimits = limits;
    }
  });
}

/**
 * Check if a bot or workspace has hit limits
 */
export async function checkLimits(botId: string, workspaceId: string): Promise<void> {
  const limits = getUsageLimits(workspaceId);
  const alertThreshold = limits.alertThreshold || 0.8;

  // Check bot limits
  if (limits.tokensPerBotPerDay || limits.costPerBotPerDay) {
    const usage = getBotUsageToday(botId);

    if (
      limits.tokensPerBotPerDay &&
      limits.tokensPerBotPerDay > 0 &&
      usage.tokens >= limits.tokensPerBotPerDay
    ) {
      await createAlert(
        botId,
        workspaceId,
        "tokens",
        usage.tokens,
        limits.tokensPerBotPerDay
      );
      await pauseBot(botId, "Token limit reached");
    } else if (
      limits.tokensPerBotPerDay &&
      limits.tokensPerBotPerDay > 0 &&
      usage.tokens >= limits.tokensPerBotPerDay * alertThreshold
    ) {
      await createAlert(
        botId,
        workspaceId,
        "tokens",
        usage.tokens,
        limits.tokensPerBotPerDay
      );
    }

    if (
      limits.costPerBotPerDay &&
      limits.costPerBotPerDay > 0 &&
      usage.cost >= limits.costPerBotPerDay
    ) {
      await createAlert(botId, workspaceId, "cost", usage.cost, limits.costPerBotPerDay);
      await pauseBot(botId, "Cost limit reached");
    } else if (
      limits.costPerBotPerDay &&
      limits.costPerBotPerDay > 0 &&
      usage.cost >= limits.costPerBotPerDay * alertThreshold
    ) {
      await createAlert(botId, workspaceId, "cost", usage.cost, limits.costPerBotPerDay);
    }
  }

  // Check workspace limits
  if (limits.tokensPerWorkspacePerDay || limits.costPerWorkspacePerDay) {
    const usage = getWorkspaceUsageToday(workspaceId);

    if (
      limits.tokensPerWorkspacePerDay &&
      limits.tokensPerWorkspacePerDay > 0 &&
      usage.tokens >= limits.tokensPerWorkspacePerDay
    ) {
      await createAlert(
        undefined,
        workspaceId,
        "tokens",
        usage.tokens,
        limits.tokensPerWorkspacePerDay
      );
      await pauseWorkspace(workspaceId, "Token limit reached");
    } else if (
      limits.tokensPerWorkspacePerDay &&
      limits.tokensPerWorkspacePerDay > 0 &&
      usage.tokens >= limits.tokensPerWorkspacePerDay * alertThreshold
    ) {
      await createAlert(
        undefined,
        workspaceId,
        "tokens",
        usage.tokens,
        limits.tokensPerWorkspacePerDay
      );
    }

    if (
      limits.costPerWorkspacePerDay &&
      limits.costPerWorkspacePerDay > 0 &&
      usage.cost >= limits.costPerWorkspacePerDay
    ) {
      await createAlert(
        undefined,
        workspaceId,
        "cost",
        usage.cost,
        limits.costPerWorkspacePerDay
      );
      await pauseWorkspace(workspaceId, "Cost limit reached");
    } else if (
      limits.costPerWorkspacePerDay &&
      limits.costPerWorkspacePerDay > 0 &&
      usage.cost >= limits.costPerWorkspacePerDay * alertThreshold
    ) {
      await createAlert(
        undefined,
        workspaceId,
        "cost",
        usage.cost,
        limits.costPerWorkspacePerDay
      );
    }
  }
}

/**
 * Create a usage alert
 */
async function createAlert(
  botId: string | undefined,
  workspaceId: string,
  type: "cost" | "tokens",
  current: number,
  limit: number
) {
  const alert: UsageAlert = {
    id: `alert-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    botId,
    workspaceId,
    type,
    threshold: current / limit,
    current,
    limit,
    timestamp: Date.now(),
  };

  update((state) => {
    if (!state.usageAlerts) state.usageAlerts = [];
    
    // Don't duplicate alerts
    const existing = state.usageAlerts.find(
      (a) =>
        a.botId === botId &&
        a.workspaceId === workspaceId &&
        a.type === type &&
        !a.dismissed &&
        a.timestamp > Date.now() - 60 * 60 * 1000 // within last hour
    );

    if (!existing) {
      state.usageAlerts.push(alert);
    }
  });
}

/**
 * Pause a bot due to limit being reached
 */
async function pauseBot(botId: string, reason: string) {
  update((state) => {
    const b = state.bots.find((x) => x.id === botId);
    if (b) {
      b.paused = true;
      b.pausedReason = reason;
      b.pausedAt = Date.now();
    }
  });
}

/**
 * Pause all bots in a workspace due to limit being reached
 */
async function pauseWorkspace(workspaceId: string, reason: string) {
  update((state) => {
    const bots = state.bots.filter((b) => workspaceOf(b) === workspaceId);
    for (const b of bots) {
      b.paused = true;
      b.pausedReason = reason;
      b.pausedAt = Date.now();
    }
  });
}

/**
 * Unpause a bot
 */
export function unpauseBot(botId: string) {
  update((state) => {
    const b = state.bots.find((x) => x.id === botId);
    if (b) {
      b.paused = false;
      b.pausedReason = undefined;
      b.pausedAt = undefined;
    }
  });
}

/**
 * Dismiss a usage alert
 */
export function dismissAlert(alertId: string) {
  update((state) => {
    const alert = state.usageAlerts?.find((a) => a.id === alertId);
    if (alert) {
      alert.dismissed = true;
    }
  });
}

/**
 * Get active (non-dismissed) alerts for a workspace
 */
export function getActiveAlerts(workspaceId: string): UsageAlert[] {
  const state = getState();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000; // last 24 hours

  return (state.usageAlerts || []).filter(
    (a) =>
      a.workspaceId === workspaceId &&
      !a.dismissed &&
      a.timestamp > cutoff
  );
}
