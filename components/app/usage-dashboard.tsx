"use client";

import { useState, useEffect } from "react";

type UsageData = {
  bot?: {
    id: string;
    name: string;
    tokens: number;
    cost: number;
    operations: number;
    paused?: boolean;
    pausedReason?: string;
  };
  workspace: {
    tokens: number;
    cost: number;
    operations: number;
    byBot: Record<string, { tokens: number; cost: number; operations: number; name: string }>;
  };
  limits: {
    tokensPerBotPerDay?: number;
    costPerBotPerDay?: number;
    tokensPerWorkspacePerDay?: number;
    costPerWorkspacePerDay?: number;
    alertThreshold?: number;
  };
  alerts: Array<{
    id: string;
    botId?: string;
    botName?: string;
    type: "cost" | "tokens";
    threshold: number;
    current: number;
    limit: number;
    timestamp: number;
  }>;
};

type UsageDashboardProps = {
  botId?: string;
  workspaceId?: string;
};

export function UsageDashboard({ botId, workspaceId }: UsageDashboardProps) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const params = new URLSearchParams();
        if (botId) params.set("botId", botId);
        if (workspaceId) params.set("workspaceId", workspaceId);

        const response = await fetch(`/api/usage?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to load usage data");
        const data = await response.json();
        setUsage(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load usage");
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
    const interval = setInterval(fetchUsage, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [botId, workspaceId]);

  const formatCost = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toString();
  };

  const getPercentage = (current: number, limit: number) => {
    if (!limit || limit === 0) return 0;
    return Math.min(100, (current / limit) * 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 80) return "bg-orange-500";
    if (percentage >= 60) return "bg-yellow-500";
    return "bg-green-500";
  };

  const dismissAlert = async (alertId: string) => {
    try {
      await fetch(`/api/usage/alerts/${alertId}`, { method: "DELETE" });
      if (usage) {
        setUsage({
          ...usage,
          alerts: usage.alerts.filter((a) => a.id !== alertId),
        });
      }
    } catch (err) {
      console.error("Failed to dismiss alert:", err);
    }
  };

  const unpauseBot = async (botId: string) => {
    try {
      await fetch(`/api/bots/${botId}/unpause`, { method: "POST" });
      if (usage?.bot) {
        setUsage({
          ...usage,
          bot: { ...usage.bot, paused: false, pausedReason: undefined },
        });
      }
    } catch (err) {
      console.error("Failed to unpause bot:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading usage data...</div>
      </div>
    );
  }

  if (error || !usage) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded">
        {error || "Failed to load usage data"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {usage.alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">Usage Alerts</h3>
          {usage.alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-3 bg-orange-50 border border-orange-200 rounded flex justify-between items-start"
            >
              <div className="flex-1">
                <div className="font-medium text-orange-800">
                  {alert.type === "cost" ? "Cost Limit" : "Token Limit"}{" "}
                  {alert.threshold >= 1 ? "Reached" : "Warning"}
                </div>
                <div className="text-sm text-orange-700 mt-1">
                  {alert.botName && `Bot: ${alert.botName} • `}
                  Current: {alert.type === "cost" ? formatCost(alert.current) : formatNumber(alert.current)} /{" "}
                  {alert.type === "cost" ? formatCost(alert.limit) : formatNumber(alert.limit)}
                </div>
              </div>
              <button
                onClick={() => dismissAlert(alert.id)}
                className="text-orange-600 hover:text-orange-800 text-sm ml-2"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bot Status */}
      {usage.bot && (
        <div>
          <h3 className="font-semibold mb-3">{usage.bot.name} - Today</h3>
          
          {usage.bot.paused && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded">
              <div className="font-medium text-red-800">Bot Paused</div>
              <div className="text-sm text-red-700 mt-1">{usage.bot.pausedReason}</div>
              <button
                onClick={() => unpauseBot(usage.bot!.id)}
                className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Unpause Bot
              </button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-sm text-gray-600">Tokens Used</div>
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(usage.bot.tokens)}
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-sm text-gray-600">Est. Cost</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCost(usage.bot.cost)}
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <div className="text-sm text-gray-600">Operations</div>
              <div className="text-2xl font-bold text-purple-600">
                {usage.bot.operations}
              </div>
            </div>
          </div>

          {/* Bot Limits */}
          {(usage.limits.tokensPerBotPerDay || usage.limits.costPerBotPerDay) && (
            <div className="space-y-3">
              {usage.limits.tokensPerBotPerDay && usage.limits.tokensPerBotPerDay > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Token Limit</span>
                    <span>
                      {formatNumber(usage.bot.tokens)} / {formatNumber(usage.limits.tokensPerBotPerDay)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded overflow-hidden">
                    <div
                      className={`h-full ${getProgressColor(
                        getPercentage(usage.bot.tokens, usage.limits.tokensPerBotPerDay)
                      )}`}
                      style={{
                        width: `${getPercentage(
                          usage.bot.tokens,
                          usage.limits.tokensPerBotPerDay
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {usage.limits.costPerBotPerDay && usage.limits.costPerBotPerDay > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Cost Limit</span>
                    <span>
                      {formatCost(usage.bot.cost)} / {formatCost(usage.limits.costPerBotPerDay)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded overflow-hidden">
                    <div
                      className={`h-full ${getProgressColor(
                        getPercentage(usage.bot.cost, usage.limits.costPerBotPerDay)
                      )}`}
                      style={{
                        width: `${getPercentage(
                          usage.bot.cost,
                          usage.limits.costPerBotPerDay
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Workspace Summary */}
      <div>
        <h3 className="font-semibold mb-3">Workspace - Today</h3>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 p-3 rounded">
            <div className="text-sm text-gray-600">Total Tokens</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(usage.workspace.tokens)}
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <div className="text-sm text-gray-600">Total Cost</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCost(usage.workspace.cost)}
            </div>
          </div>
          <div className="bg-purple-50 p-3 rounded">
            <div className="text-sm text-gray-600">Operations</div>
            <div className="text-2xl font-bold text-purple-600">
              {usage.workspace.operations}
            </div>
          </div>
        </div>

        {/* Workspace Limits */}
        {(usage.limits.tokensPerWorkspacePerDay || usage.limits.costPerWorkspacePerDay) && (
          <div className="space-y-3 mb-4">
            {usage.limits.tokensPerWorkspacePerDay && usage.limits.tokensPerWorkspacePerDay > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Workspace Token Limit</span>
                  <span>
                    {formatNumber(usage.workspace.tokens)} /{" "}
                    {formatNumber(usage.limits.tokensPerWorkspacePerDay)}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded overflow-hidden">
                  <div
                    className={`h-full ${getProgressColor(
                      getPercentage(usage.workspace.tokens, usage.limits.tokensPerWorkspacePerDay)
                    )}`}
                    style={{
                      width: `${getPercentage(
                        usage.workspace.tokens,
                        usage.limits.tokensPerWorkspacePerDay
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {usage.limits.costPerWorkspacePerDay && usage.limits.costPerWorkspacePerDay > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Workspace Cost Limit</span>
                  <span>
                    {formatCost(usage.workspace.cost)} /{" "}
                    {formatCost(usage.limits.costPerWorkspacePerDay)}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded overflow-hidden">
                  <div
                    className={`h-full ${getProgressColor(
                      getPercentage(usage.workspace.cost, usage.limits.costPerWorkspacePerDay)
                    )}`}
                    style={{
                      width: `${getPercentage(
                        usage.workspace.cost,
                        usage.limits.costPerWorkspacePerDay
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* By Bot Breakdown */}
        {Object.keys(usage.workspace.byBot).length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Usage by Bot</h4>
            <div className="space-y-2">
              {Object.entries(usage.workspace.byBot).map(([botId, data]) => (
                <div key={botId} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                  <span className="font-medium">{data.name}</span>
                  <div className="flex gap-4 text-gray-600">
                    <span>{formatNumber(data.tokens)} tokens</span>
                    <span>{formatCost(data.cost)}</span>
                    <span>{data.operations} ops</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
