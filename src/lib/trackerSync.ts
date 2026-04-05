// src/lib/trackerSync.ts
// Sync service: pulls active placements from Tracker RMS and upserts into timekeeping DB

import { SupabaseClient } from '@supabase/supabase-js';
import {
  TrackerAPI,
  TrackerPlacement,
  TrackerPlacementDetail,
  getCustomField,
  parseDisplayName,
  isSalariedPlacement,
} from './tracker';

const TRACKER_TOKEN =
  process.env.TRACKER_API_TOKEN || '3e01880319a746509e6f760a1b0e558b';

// Custom field IDs from Tracker
const CF_TIME_APPROVER_1 = 29;
const CF_TIME_APPROVER_2 = 91;
const CF_OVERTIME_EXEMPT = 31;
const CF_WORKING_STATE = 62;
const CF_EMPLOYMENT_CLASS = 82;
const CF_PURCHASE_ORDER = 28;
const CF_EXT_WORKER_ID = 90;

export interface SyncResult {
  success: boolean;
  startedAt: string;
  completedAt: string;
  placementsFetched: number;
  placementsSkipped: number;
  clientsCreated: number;
  clientsUpdated: number;
  employeesCreated: number;
  employeesUpdated: number;
  projectsCreated: number;
  projectsUpdated: number;
  assignmentsCreated: number;
  assignmentsUpdated: number;
  approversLinked: number;
  errors: string[];
}

/**
 * Main sync function: pull all active placements from Tracker and upsert into timekeeping.
 */
export async function syncPlacementsToTimekeeping(
  supabase: SupabaseClient
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    startedAt: new Date().toISOString(),
    completedAt: '',
    placementsFetched: 0,
    placementsSkipped: 0,
    clientsCreated: 0,
    clientsUpdated: 0,
    employeesCreated: 0,
    employeesUpdated: 0,
    projectsCreated: 0,
    projectsUpdated: 0,
    assignmentsCreated: 0,
    assignmentsUpdated: 0,
    approversLinked: 0,
    errors: [],
  };

  try {
    const tracker = new TrackerAPI(TRACKER_TOKEN);

    // 1. Fetch all active placements
    console.log('[TrackerSync] Fetching active placements...');
    const placements = await tracker.getActivePlacements();
    result.placementsFetched = placements.length;
    console.log(`[TrackerSync] Found ${placements.length} active placements`);

    // 2. Process each placement
    for (const placement of placements) {
      try {
        // Skip placements that don't enter timesheets
        if (placement.enterTimesheet === 'n') {
          result.placementsSkipped++;
          continue;
        }

        // Get detailed placement info (includes custom fields)
        let detail: TrackerPlacementDetail;
        try {
          detail = await tracker.getPlacementDetail(placement.opportunityResourceId);
        } catch (detailErr) {
          // Fall back to basic placement data without custom fields
          console.warn(
            `[TrackerSync] Could not fetch detail for placement ${placement.opportunityResourceId}:`,
            detailErr
          );
          detail = { ...placement, customFields: [] };
        }

        // 2a. Upsert client
        const clientId = await upsertClient(supabase, placement, result);

        // 2b. Upsert employee
        const employeeId = await upsertEmployee(supabase, placement, detail, result);

        // 2c. Upsert project
        const projectId = await upsertProject(
          supabase,
          placement,
          clientId,
          result
        );

        // 2d. Upsert project_employee assignment
        if (employeeId && projectId) {
          await upsertProjectEmployee(
            supabase,
            placement,
            employeeId,
            projectId,
            result
          );
        }

        // 2e. Set time approvers from custom fields
        if (employeeId && projectId) {
          await linkTimeApprovers(supabase, detail, employeeId, projectId, result);
        }
      } catch (placementErr: any) {
        const msg = `Error processing placement ${placement.opportunityResourceId} (${placement.resourceDisplayAs}): ${placementErr.message}`;
        console.error(`[TrackerSync] ${msg}`);
        result.errors.push(msg);
      }
    }

    // 3. Deactivate employees whose placements are no longer active
    await deactivateEndedPlacements(supabase, placements, result);

    result.success = result.errors.length === 0;
  } catch (err: any) {
    const msg = `Sync failed: ${err.message}`;
    console.error(`[TrackerSync] ${msg}`);
    result.errors.push(msg);
    result.success = false;
  }

  result.completedAt = new Date().toISOString();
  return result;
}

// ─── Upsert Helpers ──────────────────────────────────────────────────────────

async function upsertClient(
  supabase: SupabaseClient,
  placement: TrackerPlacement,
  result: SyncResult
): Promise<string> {
  const clientName = placement.clientName?.trim();
  if (!clientName) throw new Error('Placement has no clientName');

  // Try to find existing client by tracker_client_id first, then by name
  let { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('tracker_client_id', placement.clientId)
    .maybeSingle();

  if (!existing) {
    const { data: byName } = await supabase
      .from('clients')
      .select('id')
      .ilike('name', clientName)
      .maybeSingle();
    existing = byName;
  }

  if (existing) {
    // Update tracker_client_id if not set
    await supabase
      .from('clients')
      .update({
        tracker_client_id: placement.clientId,
        is_active: true,
      })
      .eq('id', existing.id);
    result.clientsUpdated++;
    return existing.id;
  }

  // Create new client
  const { data: newClient, error } = await supabase
    .from('clients')
    .insert({
      name: clientName,
      tracker_client_id: placement.clientId,
      is_active: true,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create client "${clientName}": ${error.message}`);
  result.clientsCreated++;
  return newClient.id;
}

async function upsertEmployee(
  supabase: SupabaseClient,
  placement: TrackerPlacement,
  detail: TrackerPlacementDetail,
  result: SyncResult
): Promise<string> {
  const email = placement.resourceEmail?.trim().toLowerCase();
  if (!email) throw new Error(`Placement ${placement.opportunityResourceId} has no email`);

  const { firstName, lastName } = parseDisplayName(placement.resourceDisplayAs);
  const payRate = parseFloat(placement.payRate || '0');
  const isSalaried = isSalariedPlacement(placement);
  const isExemptValue = getCustomField(detail.customFields, CF_OVERTIME_EXEMPT);
  const isExempt = isExemptValue?.toLowerCase() === 'yes' || isSalaried;
  const workingState = getCustomField(detail.customFields, CF_WORKING_STATE);
  const employmentClass = getCustomField(detail.customFields, CF_EMPLOYMENT_CLASS);
  const extWorkerId = getCustomField(detail.customFields, CF_EXT_WORKER_ID);

  // Try to find existing employee by tracker_resource_id first, then by email
  let { data: existing } = await supabase
    .from('employees')
    .select('id')
    .eq('tracker_resource_id', placement.resourceId)
    .maybeSingle();

  if (!existing) {
    const { data: byEmail } = await supabase
      .from('employees')
      .select('id')
      .ilike('email', email)
      .maybeSingle();
    existing = byEmail;
  }

  if (existing) {
    // Update existing employee
    const updateData: Record<string, any> = {
      tracker_resource_id: placement.resourceId,
      is_active: true,
    };

    // Update pay rate for hourly employees
    if (!isSalaried && payRate > 0) {
      updateData.hourly_rate = payRate;
    }

    if (workingState) updateData.state = workingState;
    if (employmentClass) updateData.employee_type = employmentClass;
    if (isExempt !== undefined) updateData.is_exempt = isExempt;
    if (extWorkerId) updateData.employee_id = extWorkerId;

    await supabase.from('employees').update(updateData).eq('id', existing.id);
    result.employeesUpdated++;
    return existing.id;
  }

  // Create new Supabase Auth user first
  const tempPassword = generateTempPassword();
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
    },
  });

  if (authError) {
    // If user already exists in auth but not in employees table, get their ID
    if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
      const { data: authList } = await supabase.auth.admin.listUsers();
      const existingAuth = authList?.users?.find(
        (u) => u.email?.toLowerCase() === email
      );
      if (existingAuth) {
        // Create employee record for existing auth user
        return await createEmployeeRecord(
          supabase,
          existingAuth.id,
          { email, firstName, lastName, payRate, isSalaried, isExempt, workingState, employmentClass, extWorkerId, resourceId: placement.resourceId },
          result
        );
      }
    }
    throw new Error(`Failed to create auth user for ${email}: ${authError.message}`);
  }

  return await createEmployeeRecord(
    supabase,
    authUser.user.id,
    { email, firstName, lastName, payRate, isSalaried, isExempt, workingState, employmentClass, extWorkerId, resourceId: placement.resourceId },
    result
  );
}

async function createEmployeeRecord(
  supabase: SupabaseClient,
  userId: string,
  data: {
    email: string;
    firstName: string;
    lastName: string;
    payRate: number;
    isSalaried: boolean;
    isExempt: boolean;
    workingState: string | null;
    employmentClass: string | null;
    extWorkerId: string | null;
    resourceId: number;
  },
  result: SyncResult
): Promise<string> {
  const { error } = await supabase.from('employees').upsert(
    {
      id: userId,
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      role: 'employee',
      is_active: true,
      hourly_rate: data.isSalaried ? null : data.payRate > 0 ? data.payRate : null,
      is_exempt: data.isExempt,
      state: data.workingState,
      employee_type: data.employmentClass,
      employee_id: data.extWorkerId,
      tracker_resource_id: data.resourceId,
    },
    { onConflict: 'id' }
  );

  if (error) throw new Error(`Failed to create employee "${data.email}": ${error.message}`);
  result.employeesCreated++;
  return userId;
}

async function upsertProject(
  supabase: SupabaseClient,
  placement: TrackerPlacement,
  clientId: string,
  result: SyncResult
): Promise<string> {
  const chargeRate = parseFloat(placement.chargeRate || '0');

  // Find existing project by tracker_opportunity_id first, then by name + client
  let { data: existing } = await supabase
    .from('projects')
    .select('id')
    .eq('tracker_opportunity_id', placement.opportunityId)
    .maybeSingle();

  if (!existing) {
    const { data: byNameClient } = await supabase
      .from('projects')
      .select('id')
      .ilike('name', placement.opportunityName?.trim() || '')
      .eq('client_id', clientId)
      .maybeSingle();
    existing = byNameClient;
  }

  const projectData: Record<string, any> = {
    name: placement.opportunityName?.trim() || `Placement ${placement.opportunityResourceId}`,
    client_id: clientId,
    tracker_opportunity_id: placement.opportunityId,
    is_active: true,
    start_date: placement.startDate || null,
    end_date: placement.endDate || null,
    is_billable: chargeRate > 0,
  };

  if (existing) {
    await supabase.from('projects').update(projectData).eq('id', existing.id);
    result.projectsUpdated++;
    return existing.id;
  }

  // Create new project
  const { data: newProject, error } = await supabase
    .from('projects')
    .insert({
      ...projectData,
      status: 'active',
      track_time: true,
      track_expenses: true,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create project "${projectData.name}": ${error.message}`);
  result.projectsCreated++;
  return newProject.id;
}

async function upsertProjectEmployee(
  supabase: SupabaseClient,
  placement: TrackerPlacement,
  employeeId: string,
  projectId: string,
  result: SyncResult
): Promise<void> {
  const payRate = parseFloat(placement.payRate || '0');
  const billRate = parseFloat(placement.chargeRate || '0');
  const isSalaried = isSalariedPlacement(placement);

  // Check if assignment already exists
  const { data: existing } = await supabase
    .from('project_employees')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('project_id', projectId)
    .maybeSingle();

  const assignmentData: Record<string, any> = {
    pay_rate: isSalaried ? null : payRate > 0 ? payRate : null,
    bill_rate: billRate > 0 ? billRate : null,
    is_active: true,
    tracker_placement_id: placement.opportunityResourceId,
  };

  if (existing) {
    await supabase
      .from('project_employees')
      .update(assignmentData)
      .eq('id', existing.id);
    result.assignmentsUpdated++;
  } else {
    const { error } = await supabase.from('project_employees').insert({
      employee_id: employeeId,
      project_id: projectId,
      ...assignmentData,
    });
    if (error) {
      throw new Error(
        `Failed to create assignment for employee ${employeeId} / project ${projectId}: ${error.message}`
      );
    }
    result.assignmentsCreated++;
  }
}

async function linkTimeApprovers(
  supabase: SupabaseClient,
  detail: TrackerPlacementDetail,
  employeeId: string,
  projectId: string,
  result: SyncResult
): Promise<void> {
  const approver1Name = getCustomField(detail.customFields, CF_TIME_APPROVER_1);
  const approver2Name = getCustomField(detail.customFields, CF_TIME_APPROVER_2);

  const approverNames = [approver1Name, approver2Name].filter(Boolean) as string[];
  if (approverNames.length === 0) return;

  for (const name of approverNames) {
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2) continue;

    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');

    // Look up approver in employees table by name
    const { data: approver } = await supabase
      .from('employees')
      .select('id')
      .ilike('first_name', firstName)
      .ilike('last_name', lastName)
      .eq('is_active', true)
      .maybeSingle();

    if (!approver) {
      // Try reverse name order
      const { data: approverReverse } = await supabase
        .from('employees')
        .select('id')
        .ilike('first_name', lastName)
        .ilike('last_name', firstName)
        .eq('is_active', true)
        .maybeSingle();

      if (!approverReverse) continue;

      // Set as manager on the employee record (first approver only)
      if (name === approver1Name) {
        await supabase
          .from('employees')
          .update({ manager_id: approverReverse.id })
          .eq('id', employeeId);
      }

      // Insert into time_approvers (upsert to avoid duplicates)
      await upsertTimeApprover(supabase, approverReverse.id, projectId);
      result.approversLinked++;
      continue;
    }

    // Set first approver as manager
    if (name === approver1Name) {
      await supabase
        .from('employees')
        .update({ manager_id: approver.id })
        .eq('id', employeeId);
    }

    await upsertTimeApprover(supabase, approver.id, projectId);
    result.approversLinked++;
  }
}

async function upsertTimeApprover(
  supabase: SupabaseClient,
  approverId: string,
  projectId: string
): Promise<void> {
  const { data: existing } = await supabase
    .from('time_approvers')
    .select('id')
    .eq('approver_id', approverId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (!existing) {
    await supabase.from('time_approvers').insert({
      approver_id: approverId,
      project_id: projectId,
    });
  }
}

/**
 * Deactivate project_employee assignments for placements that are no longer active.
 * Never delete employees -- only deactivate assignments.
 */
async function deactivateEndedPlacements(
  supabase: SupabaseClient,
  activePlacements: TrackerPlacement[],
  result: SyncResult
): Promise<void> {
  const activePlacementIds = activePlacements.map((p) => p.opportunityResourceId);

  // Get all project_employees with a tracker_placement_id
  const { data: trackedAssignments } = await supabase
    .from('project_employees')
    .select('id, tracker_placement_id, employee_id')
    .not('tracker_placement_id', 'is', null);

  if (!trackedAssignments) return;

  for (const assignment of trackedAssignments) {
    if (!activePlacementIds.includes(assignment.tracker_placement_id)) {
      // Deactivate the assignment (not the employee)
      await supabase
        .from('project_employees')
        .update({ is_active: false })
        .eq('id', assignment.id);
    }
  }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
