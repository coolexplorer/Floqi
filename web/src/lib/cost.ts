export const MODEL_RATES: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5': { input: 0.80, output: 4.00 },
  'claude-sonnet-4-6': { input: 3.00, output: 15.00 },
}

export function estimateCost(tokens: number, model?: string): number {
  const rate = MODEL_RATES[model || 'claude-haiku-4-5'] || MODEL_RATES['claude-haiku-4-5']
  const inputTokens = tokens * 0.75
  const outputTokens = tokens * 0.25
  return (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000
}
