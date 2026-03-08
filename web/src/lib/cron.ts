import { CronExpressionParser } from 'cron-parser'

/**
 * Compute the next run time for a cron expression in the given timezone.
 * Returns an ISO string, or null if the expression is invalid.
 */
export function computeNextRunAt(
  cronExpression: string,
  timezone: string = 'UTC'
): string | null {
  try {
    const interval = CronExpressionParser.parse(cronExpression, {
      tz: timezone,
    })
    return interval.next().toISOString()
  } catch {
    return null
  }
}
