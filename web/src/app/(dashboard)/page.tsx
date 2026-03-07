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

      const [automationsResult, logsResult] = await Promise.all([
        supabase
          .from("automations")
          .select("id, name, status")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("execution_logs")
          .select("id, automation_id, automation_name, status, tokens_used, created_at")
          .eq("user_id", user.id)
          .gte("created_at", weekAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const automations: Automation[] = automationsResult.data ?? [];
      const logs: ExecutionLog[] = logsResult.data ?? [];

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
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
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
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
        </div>
      </div>
    </div>
  );
}
