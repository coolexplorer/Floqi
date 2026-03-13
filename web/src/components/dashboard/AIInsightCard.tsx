import { Sparkles } from 'lucide-react'

export interface AIInsightStats {
  totalExecutions: number
  successRate: number
  totalTokens: number
  estimatedCost: number
  topAutomation?: string
  mostFailedAutomation?: string
}

export interface AIInsightCardProps {
  stats: AIInsightStats
}

function generateInsights(stats: AIInsightStats): string[] {
  const insights: string[] = []

  // Success rate evaluation
  if (stats.successRate >= 90) {
    insights.push(
      `Excellent reliability — ${stats.successRate.toFixed(1)}% success rate across ${stats.totalExecutions} executions.`
    )
  } else if (stats.successRate >= 70) {
    insights.push(
      `Good performance with ${stats.successRate.toFixed(1)}% success rate. Review failing automations to push above 90%.`
    )
  } else {
    insights.push(
      `Success rate at ${stats.successRate.toFixed(1)}% needs attention. Check error logs for recurring issues.`
    )
  }

  // Most active / most failed
  if (stats.topAutomation) {
    insights.push(`Most active automation: "${stats.topAutomation}".`)
  }
  if (stats.mostFailedAutomation) {
    insights.push(`"${stats.mostFailedAutomation}" has the most failures — consider reviewing its configuration.`)
  }

  // Cost summary
  if (stats.estimatedCost > 0) {
    const costPerExec =
      stats.totalExecutions > 0 ? stats.estimatedCost / stats.totalExecutions : 0
    insights.push(
      `Estimated cost: $${stats.estimatedCost.toFixed(2)} ($${costPerExec.toFixed(3)}/execution). ${
        stats.totalTokens > 100000
          ? 'Consider optimizing prompts to reduce token usage.'
          : 'Token usage looks efficient.'
      }`
    )
  }

  return insights.slice(0, 3)
}

export function AIInsightCard({ stats }: AIInsightCardProps) {
  const insights = generateInsights(stats)

  return (
    <div
      data-testid="ai-insight-card"
      className="rounded-lg border border-gray-200 p-4 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/50"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-indigo-500" />
        <h3 className="text-sm font-semibold text-gray-900">AI Insights</h3>
      </div>

      {insights.length === 0 ? (
        <p className="text-sm text-gray-400">Not enough data to generate insights.</p>
      ) : (
        <ul className="space-y-2">
          {insights.map((insight, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-700">
              <span className="text-indigo-400 shrink-0">•</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
