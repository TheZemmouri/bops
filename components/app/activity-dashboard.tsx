"use client";

import { useEffect, useState } from "react";

type ActivityData = {
  summary: {
    totalBots: number;
    activeSessions: number;
    messagesLast24Hours: number;
    activeRoutines: number;
  };
  recentMessages: Array<{
    id: string;
    botId: string;
    botName: string;
    text: string;
    createdAt: number;
  }>;
  activeSessions: Array<{
    id: string;
    botId: string;
    botName: string;
    goal: string;
    startedAt: number;
    status: string;
    runsOn?: string;
  }>;
  routineActivity: Array<{
    routineId: string;
    name: string;
    botId: string;
    botName: string;
    lastRun?: number;
    status?: string;
    nextRun?: number;
  }>;
  botStats: Array<{
    id: string;
    name: string;
    role: string;
    messagesLast7Days: number;
    tasksLast7Days: number;
    activeRoutines: number;
    totalRoutines: number;
  }>;
};

export function ActivityDashboard() {
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "bots" | "routines">("overview");

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const response = await fetch("/api/activity");
        if (!response.ok) throw new Error("Failed to load activity");
        const data = await response.json();
        setActivity(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load activity");
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
    const interval = setInterval(fetchActivity, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading activity...</div>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded">
        {error || "Failed to load activity"}
      </div>
    );
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold mb-4">Activity Dashboard</h2>
        
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {activity.summary.totalBots}
            </div>
            <div className="text-sm text-gray-600">Total Bots</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {activity.summary.activeSessions}
            </div>
            <div className="text-sm text-gray-600">Active Tasks</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {activity.summary.messagesLast24Hours}
            </div>
            <div className="text-sm text-gray-600">Messages (24h)</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {activity.summary.activeRoutines}
            </div>
            <div className="text-sm text-gray-600">Active Routines</div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded ${
              activeTab === "overview"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("bots")}
            className={`px-4 py-2 rounded ${
              activeTab === "bots"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            By Bot
          </button>
          <button
            onClick={() => setActiveTab("routines")}
            className={`px-4 py-2 rounded ${
              activeTab === "routines"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Routines
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {activity.activeSessions.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Active Tasks</h3>
                <div className="space-y-2">
                  {activity.activeSessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-3 bg-green-50 border border-green-200 rounded"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-green-800">
                            {session.botName}
                          </div>
                          <div className="text-sm text-gray-700 mt-1">
                            {session.goal}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTime(session.startedAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                          {session.status}
                        </span>
                        <span className="text-gray-500">{session.runsOn}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-3">Recent Messages (Last 24h)</h3>
              {activity.recentMessages.length === 0 ? (
                <div className="text-gray-500 text-sm p-4 bg-gray-50 rounded">
                  No messages in the last 24 hours
                </div>
              ) : (
                <div className="space-y-2">
                  {activity.recentMessages.slice(0, 10).map((message) => (
                    <div
                      key={message.id}
                      className="p-3 bg-white border border-gray-200 rounded"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {message.botName}
                          </div>
                          <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {message.text}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 ml-2">
                          {formatTime(message.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "bots" && (
          <div>
            <h3 className="font-semibold mb-3">Bot Performance (Last 7 Days)</h3>
            <div className="space-y-3">
              {activity.botStats.map((bot) => (
                <div
                  key={bot.id}
                  className="p-4 bg-white border border-gray-200 rounded"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{bot.name}</div>
                      <div className="text-sm text-gray-600">{bot.role}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                    <div>
                      <div className="text-gray-500">Messages</div>
                      <div className="font-semibold">{bot.messagesLast7Days}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Tasks</div>
                      <div className="font-semibold">{bot.tasksLast7Days}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Routines</div>
                      <div className="font-semibold">
                        {bot.activeRoutines}/{bot.totalRoutines}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "routines" && (
          <div>
            <h3 className="font-semibold mb-3">Recent Routine Runs</h3>
            {activity.routineActivity.length === 0 ? (
              <div className="text-gray-500 text-sm p-4 bg-gray-50 rounded">
                No routine runs in the last 7 days
              </div>
            ) : (
              <div className="space-y-2">
                {activity.routineActivity.map((routine) => (
                  <div
                    key={routine.routineId}
                    className="p-3 bg-white border border-gray-200 rounded"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium">{routine.name}</div>
                        <div className="text-sm text-gray-600">
                          {routine.botName}
                        </div>
                      </div>
                      <div className="text-right">
                        {routine.status && (
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              routine.status === "ok"
                                ? "bg-green-100 text-green-700"
                                : routine.status === "error"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {routine.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>
                        Last run:{" "}
                        {routine.lastRun
                          ? formatDateTime(routine.lastRun)
                          : "Never"}
                      </span>
                      {routine.nextRun && (
                        <span>Next: {formatDateTime(routine.nextRun)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
