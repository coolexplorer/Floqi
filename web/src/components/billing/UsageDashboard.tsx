'use client';

export interface UsageData {
  userId: string;
  plan: 'free' | 'pro';
  monthlyExecutions: number;
  monthlyExecutionLimit: number;
  monthlyTokens: number;
  monthlyTokenLimit: number;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function UsageDashboard({ usage }: { usage: UsageData }) {
  const percentage = Math.round(
    (usage.monthlyExecutions / usage.monthlyExecutionLimit) * 100
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-slate-800">Usage</h3>

      <div data-testid="usage-executions" className="space-y-2">
        <div className="flex items-center justify-between text-sm text-slate-700">
          <span>Executions</span>
          <span>
            {usage.monthlyExecutions} / {usage.monthlyExecutionLimit} ({percentage}%)
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-200">
          <div
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 rounded-full bg-blue-600 transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div data-testid="usage-tokens" className="space-y-1">
        <div className="flex items-center justify-between text-sm text-slate-700">
          <span>Tokens</span>
          <span>
            {formatNumber(usage.monthlyTokens)} / {formatNumber(usage.monthlyTokenLimit)}
          </span>
        </div>
      </div>
    </div>
  );
}
