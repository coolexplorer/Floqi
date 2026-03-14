import { headers } from "next/headers";
import {
  Activity,
  Zap,
  Database,
  CheckCircle,
  DollarSign,
  Clock,
} from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { ExecutionTrendChart } from "@/components/dashboard/ExecutionTrendChart";
import { TokenUsageChart } from "@/components/dashboard/TokenUsageChart";
import { AutomationPerformance } from "@/components/dashboard/AutomationPerformance";
import { TemplateDistribution } from "@/components/dashboard/TemplateDistribution";
import { ToolUsageChart } from "@/components/dashboard/ToolUsageChart";
import { RecentExecutions } from "@/components/dashboard/RecentExecutions";
import type { ExecutionLogEntry } from "@/components/dashboard/RecentExecutions";
import { UpcomingRuns } from "@/components/dashboard/UpcomingRuns";
import { AIInsightCard } from "@/components/dashboard/AIInsightCard";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  activeAutomations: number;
  totalExecutions: number;
  successRate: number;
  totalTokens: number;
  estimatedCost: number;
  avgDurationMs: number;
  trends: {
    executionsDelta: number;
    successRateDelta: number;
    tokensDelta: number;
    costDelta: number;
  };
}

interface ChartData {
  executionTrend: { date: string; success: number; error: number; total: number }[];
  tokenTrend: { date: string; haikuTokens: number; sonnetTokens: number; estimatedCost: number }[];
}

interface AutomationPerfEntry {
  id: string;
  name: string;
  templateType: string;
  successRate: number;
  totalExecutions: number;
  avgDurationMs: number;
  avgTokens: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

interface ToolUsageData {
  tools: { toolName: string; totalCalls: number; successCalls: number; errorCalls: number }[];
  templateDistribution: { templateType: string; count: number; percentage: number }[];
}

interface UpcomingEntry {
  automationId: string;
  automationName: string;
  templateType: string;
  nextRunAt: string;
  scheduleCron: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const trendDirection = (delta: number): "up" | "down" | "neutral" =>
  delta > 0 ? "up" : delta < 0 ? "down" : "neutral";

const formatTrend = (delta: number, suffix: string = "") => {
  if (delta === 0) return "0" + suffix;
  return (delta > 0 ? "+" : "") + delta + suffix;
};

async function safeFetch<T>(url: string, opts?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, opts);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default async function DashboardPage() {
  const headersList = await headers();
  const cookieHeader = headersList.get("cookie") ?? "";
  const opts: RequestInit = {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  };

  const [stats, charts, perf, tools, upcoming] = await Promise.all([
    safeFetch<DashboardStats>(`${BASE_URL}/api/dashboard/stats`, opts),
    safeFetch<ChartData>(`${BASE_URL}/api/dashboard/charts?days=30`, opts),
    safeFetch<{ automations: AutomationPerfEntry[] }>(`${BASE_URL}/api/dashboard/automations-performance`, opts),
    safeFetch<ToolUsageData>(`${BASE_URL}/api/dashboard/tool-usage?days=30`, opts),
    safeFetch<{ upcoming: UpcomingEntry[] }>(`${BASE_URL}/api/dashboard/upcoming`, opts),
  ]);

  // Build recent executions from perf data
  const recentExecutions: ExecutionLogEntry[] =
    perf?.automations
      .filter((a) => a.lastRunAt)
      .map((a) => ({
        id: a.id,
        automationName: a.name,
        status: (a.successRate >= 50 ? "success" : "error") as "success" | "error",
        durationMs: a.avgDurationMs,
        tokensUsed: a.avgTokens,
        toolCallCount: a.totalExecutions,
        createdAt: a.lastRunAt!,
      })) ?? [];

  // Find top automation and most failed
  const topAutomation = perf?.automations
    .slice()
    .sort((a, b) => b.totalExecutions - a.totalExecutions)[0]?.name;
  const mostFailed = perf?.automations
    .filter((a) => a.successRate < 100)
    .sort((a, b) => a.successRate - b.successRate)[0]?.name;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Dashboard</h1>

      {/* Section A: KPI Cards */}
      <section aria-labelledby="stats-heading" className="mb-8">
        <h2 id="stats-heading" className="sr-only">
          Overview Stats
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div data-testid="stat-active-automations">
            <KPICard
              value={stats?.activeAutomations ?? 0}
              label="Active Automations"
              icon={Activity}
              iconColor="text-blue-600"
              trend={stats ? trendDirection(0) : undefined}
            />
          </div>
          <div data-testid="stat-execution-count">
            <KPICard
              value={stats?.totalExecutions ?? 0}
              label="Executions This Month"
              icon={Zap}
              iconColor="text-amber-600"
              trend={stats ? trendDirection(stats.trends.executionsDelta) : undefined}
              trendValue={stats ? formatTrend(stats.trends.executionsDelta) : undefined}
            />
          </div>
          <div data-testid="stat-success-rate">
            <KPICard
              value={stats ? `${stats.successRate.toFixed(1)}%` : "0%"}
              label="Success Rate"
              icon={CheckCircle}
              iconColor="text-green-600"
              trend={stats ? trendDirection(stats.trends.successRateDelta) : undefined}
              trendValue={
                stats ? formatTrend(stats.trends.successRateDelta, "%") : undefined
              }
            />
          </div>
          <div data-testid="stat-tokens-used">
            <KPICard
              value={stats ? stats.totalTokens.toLocaleString() : "0"}
              label="Total Tokens"
              icon={Database}
              iconColor="text-purple-600"
              trend={stats ? trendDirection(stats.trends.tokensDelta) : undefined}
              trendValue={stats ? formatTrend(stats.trends.tokensDelta) : undefined}
            />
          </div>
          <div data-testid="stat-estimated-cost">
            <KPICard
              value={stats ? `$${stats.estimatedCost.toFixed(2)}` : "$0.00"}
              label="Estimated Cost"
              icon={DollarSign}
              iconColor="text-red-600"
              trend={stats ? trendDirection(stats.trends.costDelta) : undefined}
              trendValue={
                stats ? formatTrend(stats.trends.costDelta, "%") : undefined
              }
            />
          </div>
          <div data-testid="stat-avg-duration">
            <KPICard
              value={
                stats ? `${(stats.avgDurationMs / 1000).toFixed(1)}s` : "0s"
              }
              label="Avg Duration"
              icon={Clock}
              iconColor="text-cyan-600"
            />
          </div>
        </div>
      </section>

      {/* Section B: Charts */}
      <section aria-labelledby="charts-heading" className="mb-8">
        <h2 id="charts-heading" className="sr-only">
          Execution Charts
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ExecutionTrendChart data={charts?.executionTrend ?? []} />
          <TokenUsageChart data={charts?.tokenTrend ?? []} />
        </div>
      </section>

      {/* Section C: Analysis */}
      <section aria-labelledby="analysis-heading" className="mb-8">
        <h2 id="analysis-heading" className="sr-only">
          Analysis
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AutomationPerformance
            data={
              perf?.automations.map((a) => ({
                automationId: a.id,
                name: a.name,
                successRate: a.successRate,
                totalExecutions: a.totalExecutions,
              })) ?? []
            }
          />
          <TemplateDistribution
            data={tools?.templateDistribution ?? []}
            totalExecutions={stats?.totalExecutions ?? 0}
          />
          <ToolUsageChart data={tools?.tools ?? []} />
        </div>
      </section>

      {/* Section D: Details */}
      <section aria-labelledby="details-heading" className="mb-8">
        <h2 id="details-heading" className="sr-only">
          Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <RecentExecutions data={recentExecutions} />
          </div>
          <UpcomingRuns data={upcoming?.upcoming ?? []} />
        </div>
      </section>

      {/* Section E: AI Insights */}
      {stats && (
        <section aria-labelledby="insights-heading">
          <h2 id="insights-heading" className="sr-only">
            AI Insights
          </h2>
          <AIInsightCard
            stats={{
              totalExecutions: stats.totalExecutions,
              successRate: stats.successRate,
              totalTokens: stats.totalTokens,
              estimatedCost: stats.estimatedCost,
              topAutomation,
              mostFailedAutomation: mostFailed,
            }}
          />
        </section>
      )}
    </div>
  );
}
