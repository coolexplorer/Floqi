interface TokenTrendData {
  date: string
  haikuTokens: number
  sonnetTokens: number
  estimatedCost: number
}

interface TokenUsageChartProps {
  data: TokenTrendData[]
}

export function TokenUsageChart({ data }: TokenUsageChartProps) {
  return <div>TODO</div>
}
