// src/app/api/admin/employees/route.ts

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

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
    const supabase = createRouteHandlerClient({ cookies })
    
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
    const supabase = createRouteHandlerClient({ cookies })
    
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
    console.log('API received body:', body)  // ADD THIS
console.log('Email from body:', body.email)  // ADD THIS
console.log('Password from body:', body.password)  // ADD THIS
    const {
      email,
      password,
      firstName,
      lastName,
      role,
      department,
      managerId,
      hourlyRate,
      employeeId,
      mybasePayrollId,
      hireDate,
      state,
      isActive,
      isExempt
    } = body
    console.log('Extracted email:', email)  // ADD THIS
console.log('Extracted password:', password)  // ADD THIS

    // Step 1: Create auth user using admin client
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: role
      }
    })

    if (authError) {
      console.error('Auth error details:', {
        message: authError.message,
        status: authError.status,
        code: authError.code,
        details: authError
      })
      return NextResponse.json({ 
        error: `AuthApiError: ${authError.message} (${authError.code})` 
      }, { status: 400 })
    }

    if (!authUser.user) {
      return NextResponse.json({ 
        error: 'Failed to create auth user' 
      }, { status: 400 })
    }

    // Step 2: Create employee record using the auth user's ID
   // Step 2: Create employee record using the auth user's ID
   const { data: employee, error: employeeError } = await supabase
  .from('employees')
  .insert({
    id: authUser.user.id,
    email: email,
    first_name: firstName,
    last_name: lastName,
    role: role || 'employee',
    department: department || null,
    manager_id: managerId || null,
    hourly_rate: hourlyRate || null,
    pay_rate: hourlyRate || null,
    bill_rate: null,
    is_active: isActive !== undefined ? isActive : true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
  .select()
  .single()

    if (employeeError) {
      console.error('Employee creation error:', employeeError)
      
      // If employee creation fails, try to delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      
      return NextResponse.json({ 
        error: `Database error: ${employeeError.message}` 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      employee: employee,
      message: 'Employee created successfully'
    })

  } catch (error) {
    console.error('Error creating employee:', error)
    return NextResponse.json({ 
      error: 'Failed to create employee' 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
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
    const supabase = createRouteHandlerClient({ cookies })
    
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 })
  }
}