import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Sign in server-side
    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authErr) {
      return NextResponse.json({
        error: authErr.message?.includes('Invalid') ? 'Invalid email or password' : authErr.message
      }, { status: 401 });
    }

    if (!data?.session) {
      return NextResponse.json({ error: 'Login failed' }, { status: 401 });
    }

    // Look up employee
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let emp = (await adminClient.from('employees').select('id, role, is_active').eq('id', data.user.id).single()).data;
    if (!emp) {
      emp = (await adminClient.from('employees').select('id, role, is_active').eq('email', email.trim().toLowerCase()).single()).data;
    }

    if (!emp) {
      return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
    }
    if (!emp.is_active) {
      return NextResponse.json({ error: 'Account deactivated' }, { status: 403 });
    }

    // Return session tokens + role so client can set them
    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      role: emp.role,
      user_id: data.user.id,
    });
  } catch (err: any) {
    console.error('Login API error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
