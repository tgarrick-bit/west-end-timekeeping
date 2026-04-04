// src/lib/payPeriods.ts
// Pay period engine — generate periods, detect current, check lock status

export type PayPeriodType = 'weekly' | 'biweekly' | 'semimonthly'

export interface PayPeriod {
  id?: string
  period_type: PayPeriodType
  start_date: string  // YYYY-MM-DD
  end_date: string    // YYYY-MM-DD
  pay_date?: string
  is_locked: boolean
  locked_at?: string
  locked_by?: string
  status: 'open' | 'processing' | 'closed'
}

/**
 * Generate pay periods between two dates based on the period type and anchor date.
 * The anchor date is the configured start of the first period (e.g., a Monday for weekly).
 */
export function generatePeriods(
  periodType: PayPeriodType,
  anchorDate: string,
  fromDate: string,
  toDate: string
): Omit<PayPeriod, 'id'>[] {
  const periods: Omit<PayPeriod, 'id'>[] = []
  const anchor = new Date(anchorDate + 'T00:00:00')
  const from = new Date(fromDate + 'T00:00:00')
  const to = new Date(toDate + 'T00:00:00')

  if (periodType === 'weekly') {
    // Find the first period start on or before fromDate
    let current = new Date(anchor)
    while (current > from) current.setDate(current.getDate() - 7)
    while (current <= from) {
      const end = new Date(current)
      end.setDate(end.getDate() + 6)
      if (end >= from) break
      current.setDate(current.getDate() + 7)
    }

    while (current <= to) {
      const end = new Date(current)
      end.setDate(end.getDate() + 6)
      periods.push({
        period_type: 'weekly',
        start_date: formatDate(current),
        end_date: formatDate(end),
        is_locked: false,
        status: 'open',
      })
      current.setDate(current.getDate() + 7)
    }
  } else if (periodType === 'biweekly') {
    let current = new Date(anchor)
    while (current > from) current.setDate(current.getDate() - 14)
    while (current <= from) {
      const end = new Date(current)
      end.setDate(end.getDate() + 13)
      if (end >= from) break
      current.setDate(current.getDate() + 14)
    }

    while (current <= to) {
      const end = new Date(current)
      end.setDate(end.getDate() + 13)
      periods.push({
        period_type: 'biweekly',
        start_date: formatDate(current),
        end_date: formatDate(end),
        is_locked: false,
        status: 'open',
      })
      current.setDate(current.getDate() + 14)
    }
  } else if (periodType === 'semimonthly') {
    // 1st-15th and 16th-end of month
    let year = from.getFullYear()
    let month = from.getMonth()

    while (new Date(year, month, 1) <= to) {
      // First half: 1st - 15th
      const firstStart = new Date(year, month, 1)
      const firstEnd = new Date(year, month, 15)
      if (firstEnd >= from && firstStart <= to) {
        periods.push({
          period_type: 'semimonthly',
          start_date: formatDate(firstStart),
          end_date: formatDate(firstEnd),
          is_locked: false,
          status: 'open',
        })
      }

      // Second half: 16th - last day
      const lastDay = new Date(year, month + 1, 0).getDate()
      const secondStart = new Date(year, month, 16)
      const secondEnd = new Date(year, month, lastDay)
      if (secondEnd >= from && secondStart <= to) {
        periods.push({
          period_type: 'semimonthly',
          start_date: formatDate(secondStart),
          end_date: formatDate(secondEnd),
          is_locked: false,
          status: 'open',
        })
      }

      month++
      if (month > 11) { month = 0; year++ }
    }
  }

  return periods
}

/**
 * Find the pay period that contains a given date.
 */
export function findPeriodForDate(
  periods: PayPeriod[],
  date: string
): PayPeriod | undefined {
  const d = new Date(date + 'T00:00:00')
  return periods.find(p => {
    const start = new Date(p.start_date + 'T00:00:00')
    const end = new Date(p.end_date + 'T00:00:00')
    return d >= start && d <= end
  })
}

/**
 * Get the current pay period based on today's date.
 */
export function getCurrentPeriod(periods: PayPeriod[]): PayPeriod | undefined {
  const today = formatDate(new Date())
  return findPeriodForDate(periods, today)
}

/**
 * Check if a date falls within a locked pay period.
 */
export function isDateInLockedPeriod(
  periods: PayPeriod[],
  date: string
): boolean {
  const period = findPeriodForDate(periods, date)
  return period?.is_locked ?? false
}

/**
 * Get summary stats for a pay period — to be used with timesheet data.
 */
export function getPeriodLabel(period: PayPeriod): string {
  const start = new Date(period.start_date + 'T00:00:00')
  const end = new Date(period.end_date + 'T00:00:00')
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}
