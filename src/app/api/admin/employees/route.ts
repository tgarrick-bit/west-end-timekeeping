// src/app/api/admin/employees/route.ts

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { sendEmail } from '@/lib/sendEmail'

// Create admin client with service role key for user management
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key for admin operations
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    // Regular client for checking permissions
    const supabase = await createServerClient()
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentUser } = await supabase
      .from('employees')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Fetch all employees
    const { data: employees, error } = await supabase
      .from('employees')
      .select('*')
      .order('last_name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ employees })
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Regular client for checking permissions
    const supabase = await createServerClient()
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentUser } = await supabase
      .from('employees')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get form data
    const body = await request.json()
    const {
      email,
      password,
      firstName,
      lastName,
      role,
      department,
      managerId,
      hourlyRate,
      billRate,         // NEW: from frontend
      employeeId,
      mybasePayrollId,
      hireDate,
      state,
      isActive,
      isExempt,
      employeeType,
    } = body

    const effectiveRole = role || 'employee'
    const isEmployee = effectiveRole === 'employee'

    // ✅ Required fields: managerId only required for employees
    if (
      !email ||
      !password ||
      !firstName ||
      !lastName ||
      (isEmployee && !managerId)
    ) {
      let errorMessage = 'Please fill in all required fields.'

      if (isEmployee && !managerId) {
        errorMessage =
          'Please fill in all required fields, including Time Approver, for employees.'
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      )
    }

    // Step 1: Create auth user using admin client
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: effectiveRole,
      },
    })

    if (authError) {
      console.error('Auth error details:', authError)
      
      if (
        authError.message?.includes('already been registered') || 
        authError.message?.includes('already exists') ||
        authError.message?.includes('duplicate')
      ) {
        return NextResponse.json({ 
          error: 'A user with this email already exists. Please use a different email.' 
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        error: `Error creating user: ${authError.message}` 
      }, { status: 400 })
    }

    if (!authUser.user) {
      return NextResponse.json({ error: 'Failed to create auth user' }, { status: 400 })
    }

    const authId = authUser.user.id

    // Step 2: Create or update employee record using the auth user's ID
    //        (upsert makes this idempotent and avoids duplicate key errors)
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .upsert(
        {
          id: authId,
          email,
          first_name: firstName,
          last_name: lastName,
          role: effectiveRole,
          department: department || null,
          manager_id: isEmployee ? (managerId || null) : null,        // only for employees
          mybase_payroll_id: mybasePayrollId || null,
          employee_id: employeeId || null,
          hourly_rate: isEmployee ? (hourlyRate ?? null) : null,      // only for employees
          bill_rate: isEmployee ? (billRate ?? null) : null,          // only for employees
          hire_date: hireDate || null,
          state: state || null,
          is_active: isActive ?? true,
          is_exempt: isExempt ?? false,
          employee_type: employeeType || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }   // 👈 key part: if id exists, update instead of error
      )
      .select()
      .single()

    if (employeeError) {
      console.error('Employee creation error:', employeeError)

      // Cleanup auth user if employee upsert fails for some other reason
      await supabaseAdmin.auth.admin.deleteUser(authId)
      
      return NextResponse.json({ 
        error: `Database error: ${employeeError.message}` 
      }, { status: 400 })
    }

    // Send password reset link so the user can set their own password securely
    // (avoids sending plaintext passwords in email)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    try {
      await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `${appUrl}/auth/login` },
      })
    } catch (resetError) {
      console.error('Failed to trigger password reset:', resetError)
    }

    // Send welcome email with login instructions (direct SMTP, no self-calling fetch)
    try {
      const logoUrl = 'https://westendworkforce.com/wp-content/uploads/2025/11/WE-logo-SEPT2024v3-WHT.png'

      await sendEmail({
        to: email,
        subject: 'Welcome to West End Workforce Timekeeping',
        html: `
          <div style="max-width:600px;margin:0 auto;font-family:'Montserrat',Arial,sans-serif;">
            <div style="background:#1a1a1a;padding:20px;text-align:center;">
              <img src="${logoUrl}" alt="West End Workforce" style="height:40px;" />
            </div>
            <div style="padding:30px 20px;background:#ffffff;">
              <h2 style="color:#1a1a1a;margin:0 0 16px;">Welcome, ${firstName}!</h2>
              <p style="color:#555;line-height:1.6;">
                Your account has been created on the West End Workforce timekeeping portal.
                You can now log in to submit timesheets and expense reports.
              </p>
              <div style="background:#FAFAF8;border:0.5px solid #e8e4df;border-radius:10px;padding:16px;margin:20px 0;">
                <p style="margin:0 0 12px;color:#1a1a1a;font-weight:600;">Your Login Details:</p>
                <p style="margin:0 0 6px;color:#555;">Email: <strong>${email}</strong></p>
                <p style="margin:0 0 6px;color:#555;">Temporary Password: <strong style="color:#e31c79;letter-spacing:0.5px;">${password}</strong></p>
                <p style="margin:10px 0 0;color:#999;font-size:12px;">
                  Please change your password after your first login.
                </p>
              </div>
              <div style="text-align:center;margin:24px 0;">
                <a href="${appUrl}/auth/login"
                   style="background:#e31c79;color:#ffffff;padding:12px 32px;border-radius:7px;text-decoration:none;font-weight:600;display:inline-block;">
                  Go to Login
                </a>
              </div>
              <p style="color:#999;font-size:13px;line-height:1.5;">
                If you have any questions, please contact your manager or the payroll team at
                <a href="mailto:payroll@westendworkforce.com" style="color:#e31c79;">payroll@westendworkforce.com</a>.
              </p>
            </div>
            <div style="background:#FAFAF8;padding:16px;text-align:center;font-size:12px;color:#c0bab2;border-top:1px solid #e31c79;">
              West End Workforce &middot; 800 Town &amp; Country Blvd, Suite 500 &middot; Houston, TX 77024
            </div>
          </div>
        `,
      })
    } catch (emailError) {
      // Don't fail the creation if email fails — just log it
      console.error('Failed to send welcome email:', emailError)
    }

    // Audit log: employee created
    await logAudit(supabase, user.id, 'employee.create', {
      entity_type: 'employee',
      entity_id: authId,
      employee_email: email,
      role: effectiveRole,
    })

    return NextResponse.json({
      success: true,
      employee,
      message: 'Employee created successfully',
    })

  } catch (error) {
    console.error('Error creating employee:', error)
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentUser } = await supabase
      .from('employees')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('id')
    
    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 })
    }

    const body = await request.json()
    
    // Update employee record
    const { data: employee, error } = await supabase
      .from('employees')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', employeeId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Audit log: employee updated
    await logAudit(supabase, user.id, 'employee.update', {
      entity_type: 'employee',
      entity_id: employeeId,
      updated_fields: Object.keys(body),
    })

    // If email changed, update auth user email
    if (body.email) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        employeeId,
        { email: body.email }
      )
      
      if (authError) {
        console.error('Failed to update auth email:', authError)
      }
    }

    return NextResponse.json({ employee })
  } catch (error) {
    console.error('Error updating employee:', error)
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentUser } = await supabase
      .from('employees')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('id')
    
    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 })
    }

    // Delete from employees table
    const { error: deleteError } = await supabase
      .from('employees')
      .delete()
      .eq('id', employeeId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Delete auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(employeeId)

    if (authError) {
      console.error('Failed to delete auth user:', authError)
    }

    // Audit log: employee deactivated/deleted
    await logAudit(supabase, user.id, 'employee.delete', {
      entity_type: 'employee',
      entity_id: employeeId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 })
  }
}