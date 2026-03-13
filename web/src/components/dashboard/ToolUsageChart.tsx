interface ToolUsageData {
  toolName: string
  totalCalls: number
  successCalls: number
  errorCalls: number
}

interface ToolUsageChartProps {
  data: ToolUsageData[]
}

export function ToolUsageChart({ data }: ToolUsageChartProps) {
  return <div>TODO</div>
}
