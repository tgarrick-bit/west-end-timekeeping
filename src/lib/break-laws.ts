// src/lib/break-laws.ts
// State-specific meal period and rest break requirements

export interface BreakLawConfig {
  state: string
  stateName: string
  mealBreak: {
    threshold: number       // hours worked before meal required
    duration: number        // minutes
    waiverAllowed: boolean  // can employee waive if shift <= waiver threshold?
    waiverMaxHours: number | null  // shift length where waiver is allowed
    secondMeal?: {
      threshold: number     // hours worked before second meal required
    }
  }
  restBreak: {
    perHours: number        // rest break per X hours worked
    duration: number        // minutes
    paid: boolean
  }
  attestationText: string   // plain-language attestation shown to employee
  lawReference: string      // statute citation
}

/**
 * States that require meal/rest break attestation on timesheets.
 * Only employees working in these states see the break attestation checkbox.
 */
export const BREAK_LAW_STATES: Record<string, BreakLawConfig> = {
  CA: {
    state: 'CA',
    stateName: 'California',
    mealBreak: {
      threshold: 5,
      duration: 30,
      waiverAllowed: true,
      waiverMaxHours: 6,
      secondMeal: { threshold: 10 },
    },
    restBreak: {
      perHours: 4,
      duration: 10,
      paid: true,
    },
    attestationText:
      'I certify that during this pay period I received all meal periods (30 min for shifts over 5 hours) ' +
      'and rest breaks (10 min per 4 hours worked) required under California Labor Code §512 and applicable ' +
      'IWC Wage Orders. If I worked 6 hours or less, I voluntarily waived my meal period. ' +
      'If I was unable to take any required break, I reported it to my supervisor.',
    lawReference: 'Cal. Labor Code §512, IWC Wage Orders §11, §12',
  },

  OR: {
    state: 'OR',
    stateName: 'Oregon',
    mealBreak: {
      threshold: 6,
      duration: 30,
      waiverAllowed: false,
      waiverMaxHours: null,
      secondMeal: { threshold: 14 },
    },
    restBreak: {
      perHours: 4,
      duration: 10,
      paid: true,
    },
    attestationText:
      'I certify that during this pay period I received all meal periods (30 min for shifts over 6 hours) ' +
      'and rest breaks (10 min per 4 hours worked) required under Oregon Revised Statutes §653.261. ' +
      'If I was unable to take any required break, I reported it to my supervisor.',
    lawReference: 'ORS §653.261',
  },

  WA: {
    state: 'WA',
    stateName: 'Washington',
    mealBreak: {
      threshold: 5,
      duration: 30,
      waiverAllowed: true,
      waiverMaxHours: 6,
      secondMeal: { threshold: 10 },
    },
    restBreak: {
      perHours: 4,
      duration: 10,
      paid: true,
    },
    attestationText:
      'I certify that during this pay period I received all meal periods (30 min for shifts over 5 hours) ' +
      'and rest breaks (10 min per 4 hours worked) required under Washington Administrative Code 296-126-092. ' +
      'If I was unable to take any required break, I reported it to my supervisor.',
    lawReference: 'WAC 296-126-092',
  },

  CO: {
    state: 'CO',
    stateName: 'Colorado',
    mealBreak: {
      threshold: 5,
      duration: 30,
      waiverAllowed: true,
      waiverMaxHours: 6,
    },
    restBreak: {
      perHours: 4,
      duration: 10,
      paid: true,
    },
    attestationText:
      'I certify that during this pay period I received all meal periods (30 min for shifts over 5 hours) ' +
      'and rest breaks (10 min per 4 hours worked) required under Colorado Overtime and Minimum Pay Standards ' +
      'Order (COMPS Order) #39. If I was unable to take any required break, I reported it to my supervisor.',
    lawReference: 'COMPS Order #39, 7 CCR 1103-1',
  },
}

/**
 * Returns the break law config for a given state, or null if that state
 * doesn't require break attestation.
 */
export function getBreakLawConfig(state: string | null | undefined): BreakLawConfig | null {
  if (!state) return null
  const upper = state.toUpperCase().trim()
  return BREAK_LAW_STATES[upper] || null
}

/**
 * Returns true if the employee's state requires meal/rest break attestation.
 */
export function requiresBreakAttestation(state: string | null | undefined): boolean {
  return getBreakLawConfig(state) !== null
}
