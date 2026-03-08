"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Zap, Database, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StatCard } from "@/components/cards/StatCard";

interface Automation {
  id: string;
  name: string;
  status: string;
}

interface ExecutionLog {
  id: string;
  automation_id: string;
  automation_name: string;
  status: string;
  tokens_used: number;
  created_at: string;
}

interface DashboardStats {
  activeAutomations: number;
  executionCount: number;
  tokensUsed: number;
  successRate: number;
  recentAutomations: Automation[];
  recentLogs: ExecutionLog[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      const supabase = createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!user || error) {
        router.push("/login");
        return;
      }

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Fetch user's automations first
      const automationsResult = await supabase
        .from("automations")
        .select("id, name, status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      const automations: Automation[] = automationsResult.data ?? [];
      const automationIds = automations.map((a) => a.id);

      // Build automation name lookup
      const nameMap: Record<string, string> = {};
      for (const a of automations) {
        nameMap[a.id] = a.name;
      }

      // Fetch execution logs for user's automations
      let logs: ExecutionLog[] = [];
      if (automationIds.length > 0) {
        const logsResult = await supabase
          .from("execution_logs")
          .select("id, automation_id, status, tokens_used, created_at")
          .in("automation_id", automationIds)
          .gte("created_at", weekAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(10);

        logs = (logsResult.data ?? []).map((l) => ({
          id: l.id,
          automation_id: l.automation_id,
          automation_name: nameMap[l.automation_id] ?? "Unknown",
          status: l.status,
          tokens_used: l.tokens_used,
          created_at: l.created_at,
        }));
      }

      const activeCount = automations.filter((a) => a.status === "active").length;
      const totalTokens = logs.reduce((sum, log) => sum + (log.tokens_used ?? 0), 0);
      const successCount = logs.filter((log) => log.status === "success").length;
      const successRate =
        logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 0;

      setStats({
        activeAutomations: activeCount,
        executionCount: logs.length,
        tokensUsed: totalTokens,
        successRate,
        recentAutomations: automations,
        recentLogs: logs.slice(0, 5),
      });
    }

    loadDashboard();
  }, [router]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Dashboard</h1>

      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">Overview Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div data-testid="stat-active-automations">
            <StatCard
              value={stats?.activeAutomations ?? 0}
              label="Active Automations"
              icon={Activity}
            />
          </div>
          <div data-testid="stat-execution-count">
            <StatCard
              value={stats?.executionCount ?? 0}
              label="Executions This Week"
              icon={Zap}
            />
          </div>
          <div data-testid="stat-tokens-used">
            <StatCard
              value={stats ? stats.tokensUsed.toLocaleString() : 0}
              label="Tokens Used"
              icon={Database}
            />
          </div>
          <div data-testid="stat-success-rate">
            <StatCard
              value={stats ? `${stats.successRate}%` : "0%"}
              label="Success Rate"
              icon={CheckCircle}
            />
          </div>
        </div>
      </section>

      {/* Charts Section */}
      {stats && (
        <section aria-labelledby="charts-heading" className="mb-8">
          <h2 id="charts-heading" className="sr-only">Execution Charts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div data-testid="execution-trend-chart" className="rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Execution Trend</h3>
              {(() => {
                const counts: Record<string, number> = {};
                stats.recentLogs.forEach((log) => {
                  const date = new Date(log.created_at).toLocaleDateString();
                  counts[date] = (counts[date] || 0) + 1;
                });
                const chartData = Object.entries(counts).map(([date, count]) => ({ date, count }));
                return (
                  <>
                    <div
                      role="img"
                      aria-label="Execution trend chart showing daily execution counts"
                      className="flex gap-1 items-end h-[200px]"
                    >
                      {chartData.map((d) => (
                        <div
                          key={d.date}
                          data-chart-point={d.date}
                          className="flex-1 bg-blue-500 rounded-t"
                          style={{ height: `${Math.max(d.count * 40, 20)}px` }}
                          title={`${d.date}: ${d.count}`}
                        />
                      ))}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {chartData.map((d) => (
                        <span key={d.date} className="flex-1 text-[10px] text-gray-500 text-center truncate">
                          {d.date}
                        </span>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
            <div data-testid="success-rate-chart" className="rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Success Rate</h3>
              <div
                role="img"
                aria-label={`Success rate: ${stats.successRate}%`}
                className="flex items-center justify-center h-[200px]"
              >
                <div className="text-center">
                  <span className="text-4xl font-bold text-green-600">{stats.successRate}</span>
                  <span className="text-lg text-gray-500">%</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section aria-labelledby="recent-automations-heading">
          <h2 id="recent-automations-heading" className="text-lg font-semibold text-gray-900 mb-3">
            Recent Automations
          </h2>
          <div className="space-y-2">
            {(stats?.recentAutomations ?? []).map((auto) => (
              <div
                key={auto.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200"
              >
                <span className="text-sm font-medium text-gray-900">{auto.name}</span>
                <span className="text-xs text-gray-500 capitalize">{auto.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="recent-executions-heading">
          <h2 id="recent-executions-heading" className="text-lg font-semibold text-gray-900 mb-3">
            Recent Executions
          </h2>
          <div className="space-y-2">
            {(stats?.recentLogs ?? []).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200"
              >
                <span className="text-xs text-gray-500 capitalize">{log.status}</span>
                <span className="text-xs text-gray-400">
                  {new Date(log.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
