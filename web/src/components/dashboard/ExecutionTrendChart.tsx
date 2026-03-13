interface ExecutionTrendData {
  date: string
  success: number
  error: number
  total: number
}

interface ExecutionTrendChartProps {
  data: ExecutionTrendData[]
}

export function ExecutionTrendChart({ data }: ExecutionTrendChartProps) {
  return <div>TODO</div>
}
