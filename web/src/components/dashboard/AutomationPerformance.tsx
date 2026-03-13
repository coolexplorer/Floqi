interface AutomationPerfData {
  automationId: string
  name: string
  successRate: number
  totalExecutions: number
}

interface AutomationPerformanceProps {
  data: AutomationPerfData[]
}

export function AutomationPerformance({ data }: AutomationPerformanceProps) {
  return <div>TODO</div>
}
