// src/lib/overtime.ts
// Overtime calculation engine with state-specific rules

export interface OTConfig {
  weeklyOTThreshold: number    // hours per week before OT kicks in (default 40)
  dailyOTThreshold: number | null  // hours per day before OT (null = no daily OT)
  dailyDTThreshold: number | null  // hours per day before double-time (null = no DT)
}

export interface OTResult {
  regularHours: number
  overtimeHours: number
  doubleTimeHours: number
  totalHours: number
}

// States that require daily overtime (>8 hrs/day = OT, >12 hrs/day = DT)
const DAILY_OT_STATES: Record<string, { otThreshold: number; dtThreshold: number | null }> = {
  'CA': { otThreshold: 8, dtThreshold: 12 },
  'AK': { otThreshold: 8, dtThreshold: null },
  'NV': { otThreshold: 8, dtThreshold: null },
  'CO': { otThreshold: 12, dtThreshold: null },
}

/**
 * Get OT config for a given employee state and company settings.
 */
export function getOTConfig(
  employeeState: string | null | undefined,
  companySettings: {
    ot_week_hours?: number
    ot_day_hours?: number | null
    dt_day_hours?: number | null
  }
): OTConfig {
  const weeklyOT = companySettings.ot_week_hours || 40

  // Check company-level override first
  if (companySettings.ot_day_hours) {
    return {
      weeklyOTThreshold: weeklyOT,
      dailyOTThreshold: companySettings.ot_day_hours,
      dailyDTThreshold: companySettings.dt_day_hours || null,
    }
  }

  // Then check state-specific rules
  const state = (employeeState || '').toUpperCase()
  if (state && DAILY_OT_STATES[state]) {
    return {
      weeklyOTThreshold: weeklyOT,
      dailyOTThreshold: DAILY_OT_STATES[state].otThreshold,
      dailyDTThreshold: DAILY_OT_STATES[state].dtThreshold,
    }
  }

  // Default: weekly OT only
  return {
    weeklyOTThreshold: weeklyOT,
    dailyOTThreshold: null,
    dailyDTThreshold: null,
  }
}

/**
 * Calculate overtime for a week given daily hour totals.
 * Handles both daily and weekly OT rules.
 *
 * @param dailyHours - array of 7 daily hour totals (Sun-Sat or Mon-Sun)
 * @param config - OT configuration
 * @param isExempt - if true, returns all hours as regular (no OT)
 */
export function calculateOvertime(
  dailyHours: number[],
  config: OTConfig,
  isExempt: boolean = false
): OTResult {
  const totalHours = dailyHours.reduce((sum, h) => sum + h, 0)

  if (isExempt) {
    return {
      regularHours: totalHours,
      overtimeHours: 0,
      doubleTimeHours: 0,
      totalHours,
    }
  }

  let dailyOT = 0
  let dailyDT = 0
  let dailyRegular = 0

  if (config.dailyOTThreshold) {
    // Calculate daily OT first
    for (const hours of dailyHours) {
      if (config.dailyDTThreshold && hours > config.dailyDTThreshold) {
        // Double time: hours above DT threshold
        dailyDT += hours - config.dailyDTThreshold
        // OT: hours between OT and DT threshold
        dailyOT += config.dailyDTThreshold - config.dailyOTThreshold
        // Regular: up to OT threshold
        dailyRegular += config.dailyOTThreshold
      } else if (hours > config.dailyOTThreshold) {
        // OT: hours above daily threshold
        dailyOT += hours - config.dailyOTThreshold
        // Regular: up to threshold
        dailyRegular += config.dailyOTThreshold
      } else {
        dailyRegular += hours
      }
    }

    // Also check weekly OT on the regular hours
    // If regular daily hours exceed weekly threshold, the excess is also OT
    const weeklyExcess = Math.max(0, dailyRegular - config.weeklyOTThreshold)
    if (weeklyExcess > 0) {
      dailyRegular -= weeklyExcess
      dailyOT += weeklyExcess
    }

    return {
      regularHours: Math.round(dailyRegular * 100) / 100,
      overtimeHours: Math.round(dailyOT * 100) / 100,
      doubleTimeHours: Math.round(dailyDT * 100) / 100,
      totalHours: Math.round(totalHours * 100) / 100,
    }
  }

  // Weekly OT only (simple case)
  const regularHours = Math.min(totalHours, config.weeklyOTThreshold)
  const overtimeHours = Math.max(0, totalHours - config.weeklyOTThreshold)

  return {
    regularHours: Math.round(regularHours * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    doubleTimeHours: 0,
    totalHours: Math.round(totalHours * 100) / 100,
  }
}
