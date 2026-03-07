/**
 * Cron utility functions for converting between preset names and cron expressions.
 *
 * Preset format:
 *   Daily:  "daily-{H}am" | "daily-{H}pm"   e.g. "daily-7am", "daily-6pm"
 *   Weekly: "weekly-{day}-{H}am" | "weekly-{day}-{H}pm"  e.g. "weekly-mon-9am"
 *
 * Cron format: "minute hour dom month dow"  (standard 5-field)
 */

const DAY_TO_NUM: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
}

const NUM_TO_DAY: Record<number, string> = {
  0: 'sun',
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
}

/**
 * Parse a time suffix like "7am", "12pm", "6pm" into a 24-hour value (0-23).
 * Throws if the suffix is invalid.
 */
function parseTimeSuffix(time: string): number {
  const match = time.match(/^(\d+)(am|pm)$/)
  if (!match) throw new Error(`Invalid time suffix: "${time}"`)

  const h = parseInt(match[1], 10)
  const suffix = match[2]

  if (suffix === 'am') {
    if (h === 12) return 0
    if (h < 1 || h > 11) throw new Error(`Invalid hour in suffix "${time}": ${h}`)
    return h
  } else {
    if (h === 12) return 12
    if (h < 1 || h > 11) throw new Error(`Invalid hour in suffix "${time}": ${h}`)
    return h + 12
  }
}

/**
 * Convert a 24-hour value (0-23) to the label used in preset strings.
 * e.g. 7 → "7am", 12 → "12pm", 18 → "6pm", 0 → "12am"
 */
function hourToLabel(hour: number): string {
  if (hour === 0) return '12am'
  if (hour < 12) return `${hour}am`
  if (hour === 12) return '12pm'
  return `${hour - 12}pm`
}

/**
 * Convert a named schedule preset to a 5-field UTC cron expression.
 *
 * @param preset - e.g. "daily-7am", "weekly-mon-9am", "weekly-fri-5pm"
 * @returns cron expression e.g. "0 7 * * *"
 * @throws Error if preset is unrecognised or has invalid values
 *
 * @example
 * presetToCron("daily-7am")       // "0 7 * * *"
 * presetToCron("weekly-mon-9am")  // "0 9 * * 1"
 * presetToCron("weekly-fri-5pm")  // "0 17 * * 5"
 */
export function presetToCron(preset: string): string {
  if (!preset) throw new Error('preset must be a non-empty string')

  const parts = preset.split('-')

  if (parts[0] === 'daily') {
    // Format: daily-{H}am or daily-{H}pm
    if (parts.length < 2) throw new Error(`Invalid daily preset: "${preset}"`)
    const timeSuffix = parts.slice(1).join('-') // rejoin in case of unexpected dashes
    const hour = parseTimeSuffix(timeSuffix)
    return `0 ${hour} * * *`
  }

  if (parts[0] === 'weekly') {
    // Format: weekly-{day}-{H}am or weekly-{day}-{H}pm
    if (parts.length < 3) throw new Error(`Invalid weekly preset (missing time): "${preset}"`)
    const day = parts[1]
    const timeSuffix = parts.slice(2).join('-')
    const dayNum = DAY_TO_NUM[day]
    if (dayNum === undefined) throw new Error(`Unknown day "${day}" in preset "${preset}"`)
    const hour = parseTimeSuffix(timeSuffix)
    return `0 ${hour} * * ${dayNum}`
  }

  throw new Error(`Unknown preset: "${preset}"`)
}

/**
 * Convert a 5-field cron expression to a named preset string, or "custom" if
 * the expression doesn't match any known preset pattern.
 *
 * Only simple daily/weekly crons with minute=0 map to named presets.
 *
 * @param cron - 5-field cron expression e.g. "0 7 * * *"
 * @returns preset name e.g. "daily-7am", or "custom"
 * @throws Error if the string is not a valid 5-field cron expression
 *
 * @example
 * cronToPreset("0 7 * * *")    // "daily-7am"
 * cronToPreset("0 9 * * 1")   // "weekly-mon-9am"
 * cronToPreset("every 15min") // "custom"
 */
export function cronToPreset(cron: string): string {
  if (!cron) throw new Error('cron must be a non-empty string')

  const parts = cron.split(' ')
  if (parts.length !== 5) throw new Error(`Invalid cron expression (expected 5 fields): "${cron}"`)

  const [minute, hour, dom, month, dow] = parts

  const isPlainInt = (s: string) => /^\d+$/.test(s)

  // Simple daily: "0 H * * *"
  if (
    minute === '0' &&
    isPlainInt(hour) &&
    dom === '*' &&
    month === '*' &&
    dow === '*'
  ) {
    return `daily-${hourToLabel(parseInt(hour, 10))}`
  }

  // Simple weekly: "0 H * * D"
  if (
    minute === '0' &&
    isPlainInt(hour) &&
    dom === '*' &&
    month === '*' &&
    isPlainInt(dow)
  ) {
    const d = parseInt(dow, 10)
    const dayLabel = NUM_TO_DAY[d]
    if (dayLabel) return `weekly-${dayLabel}-${hourToLabel(parseInt(hour, 10))}`
  }

  return 'custom'
}

/**
 * Validate a 5-field cron expression.
 *
 * Supports: plain integers, "*", "* /n" steps, "n-m" ranges.
 * Range checks:
 *   minute: 0-59, hour: 0-23, dom: 1-31, month: 1-12, dow: 0-7
 *
 * @param cron - cron expression to validate
 * @returns true if the expression is valid, false otherwise
 *
 * @example
 * isValidCron("0 7 * * *")        // true
 * isValidCron("60 9 * * *")       // false (minute > 59)
 * isValidCron("invalid")          // false
 */
export function isValidCron(cron: string): boolean {
  if (!cron) return false

  const parts = cron.split(' ')
  if (parts.length !== 5) return false

  const [minute, hour, dom, month, dow] = parts

  function validField(field: string, min: number, max: number): boolean {
    if (field === '*') return true
    if (/^\*\/\d+$/.test(field)) {
      const step = parseInt(field.slice(2), 10)
      return step >= 1 && step <= max
    }
    if (/^\d+-\d+$/.test(field)) {
      const [a, b] = field.split('-').map(Number)
      return a >= min && b <= max && a <= b
    }
    if (/^\d+$/.test(field)) {
      const n = parseInt(field, 10)
      return n >= min && n <= max
    }
    return false
  }

  return (
    validField(minute, 0, 59) &&
    validField(hour, 0, 23) &&
    validField(dom, 1, 31) &&
    validField(month, 1, 12) &&
    validField(dow, 0, 7)
  )
}
