// src/lib/tracker.ts
// Tracker RMS API Client for syncing placements, candidates, and clients

const TRACKER_BASE_URL = 'https://evousapi.tracker-rms.com';

// Active placement status IDs to sync
const ACTIVE_STATUS_IDS = [9, 21, 12]; // On Assignment - WE, On Assignment - EOR, Placed Direct

export interface TrackerPlacement {
  opportunityResourceId: number;
  opportunityId: number;
  resourceId: number;
  clientId: number;
  opportunityName: string;
  opportunityResourceStatusName: string;
  opportunityResourceStatusId: number;
  startDate: string;
  endDate: string;
  payRate: string;
  chargeRate: string;
  overtimeRate: string;
  activeRecord: string;
  enterTimesheet: string;
  timesheetEntry: string;
  daysOfWeek: string;
  clientName: string;
  resourceDisplayAs: string;
  resourceEmail: string;
  firstOwnerId: number;
  secondOwnerId: number;
}

export interface TrackerCustomField {
  id: number;
  name: string;
  value: string;
}

export interface TrackerPlacementDetail extends TrackerPlacement {
  customFields: TrackerCustomField[];
}

export interface TrackerCandidate {
  resourceId: number;
  displayAs: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface PagedSearchResponse {
  data: TrackerPlacement[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
}

export class TrackerAPI {
  private bearerToken: string;
  private jwt: string | null = null;
  private jwtExpiresAt: Date | null = null;

  constructor(bearerToken: string) {
    this.bearerToken = bearerToken;
  }

  /**
   * Exchange bearer token for a JWT (valid 7 days).
   * Caches the JWT and only re-authenticates when expired.
   */
  async authenticate(): Promise<string> {
    // Return cached JWT if still valid (with 1hr buffer)
    if (this.jwt && this.jwtExpiresAt && new Date() < this.jwtExpiresAt) {
      return this.jwt;
    }

    const response = await fetch(`${TRACKER_BASE_URL}/api/Auth/ExchangeToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bearerToken: this.bearerToken }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tracker auth failed (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    this.jwt = result.token || result.jwt || result;

    if (typeof this.jwt !== 'string') {
      throw new Error('Tracker auth returned unexpected format');
    }

    // JWT valid for 7 days; cache with a 1-hour safety buffer
    this.jwtExpiresAt = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
    return this.jwt;
  }

  /**
   * Make an authenticated request to the Tracker API.
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const jwt = await this.authenticate();

    const response = await fetch(`${TRACKER_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tracker API error ${response.status} on ${endpoint}: ${errorText}`);
    }

    return response.json();
  }

  /**
   * Paginate through all active placements matching status IDs 9, 21, 12.
   * The Tracker search API caps at 10 results per page.
   */
  async getActivePlacements(): Promise<TrackerPlacement[]> {
    const allPlacements: TrackerPlacement[] = [];
    let pageNumber = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await this.request<PagedSearchResponse>(
        '/api/v1/OpportunityResource/Search',
        {
          method: 'POST',
          body: JSON.stringify({
            searchText: '',
            pageSize: 10,
            pageNumber,
          }),
        }
      );

      const placements = result.data || [];

      // Filter for active status IDs
      const activePlacements = placements.filter(
        (p) =>
          ACTIVE_STATUS_IDS.includes(p.opportunityResourceStatusId) &&
          p.activeRecord === 'y'
      );

      allPlacements.push(...activePlacements);

      // Check if there are more pages
      if (placements.length < 10 || pageNumber * 10 >= result.totalRecords) {
        hasMore = false;
      } else {
        pageNumber++;
      }
    }

    return allPlacements;
  }

  /**
   * Get detailed placement info including custom fields.
   */
  async getPlacementDetail(id: number): Promise<TrackerPlacementDetail> {
    return this.request<TrackerPlacementDetail>(
      `/api/v1/OpportunityResource/${id}`
    );
  }

  /**
   * Get candidate/resource details.
   */
  async getCandidate(id: number): Promise<TrackerCandidate> {
    return this.request<TrackerCandidate>(`/api/v1/Resource/${id}`);
  }
}

/**
 * Extract a custom field value by field ID from a placement detail.
 */
export function getCustomField(
  customFields: TrackerCustomField[] | undefined,
  fieldId: number
): string | null {
  if (!customFields) return null;
  const field = customFields.find((f) => f.id === fieldId);
  return field?.value || null;
}

/**
 * Parse "FirstName LastName" from resourceDisplayAs.
 * Handles formats like "Tiffany Feintuch" or "Smith, John".
 */
export function parseDisplayName(displayAs: string): { firstName: string; lastName: string } {
  if (!displayAs) return { firstName: '', lastName: '' };

  const trimmed = displayAs.trim();

  // Handle "Last, First" format
  if (trimmed.includes(',')) {
    const [last, first] = trimmed.split(',').map((s) => s.trim());
    return { firstName: first || '', lastName: last || '' };
  }

  // Handle "First Last" format
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

/**
 * Determine if a placement represents a salaried (direct hire) position.
 * High payRate (>= 1000) with "Placed Direct" status indicates annual salary.
 */
export function isSalariedPlacement(placement: TrackerPlacement): boolean {
  const payRate = parseFloat(placement.payRate || '0');
  return placement.opportunityResourceStatusId === 12 && payRate >= 1000;
}

/**
 * Stub: Push timesheet hours to Tracker RMS.
 * Called when a timesheet is approved/finalized.
 */
export function pushTimesheetToTracker(
  placementId: number,
  weekEnding: string,
  totalHours: number
): void {
  console.log(
    `Tracker timesheet push not yet implemented — would push ${totalHours} hours for placement ${placementId} (week ending ${weekEnding})`
  );
}
