import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes
  const protectedPaths = ['/employee', '/manager', '/admin', '/client', '/timesheet', '/expense', '/dashboard']
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  // Allow test page and auth pages
  if (request.nextUrl.pathname === '/test' || request.nextUrl.pathname.startsWith('/auth/')) {
    return supabaseResponse
  }

  // Redirect to login if accessing protected route without user
  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Role-based route enforcement for authenticated users on protected paths
  if (isProtectedPath && user) {
    const { data: emp } = await supabase
      .from('employees')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = emp?.role || 'employee'
    const pathname = request.nextUrl.pathname

    // /admin/* routes: require admin role
    if (pathname.startsWith('/admin')) {
      if (role !== 'admin') {
        const url = request.nextUrl.clone()
        url.pathname = getDashboardForRole(role)
        return NextResponse.redirect(url)
      }
    }

    // /manager/* routes: require admin, manager, or time_approver
    if (pathname.startsWith('/manager')) {
      if (!['admin', 'manager', 'time_approver'].includes(role)) {
        const url = request.nextUrl.clone()
        url.pathname = getDashboardForRole(role)
        return NextResponse.redirect(url)
      }
    }

    // /client/* routes: require client_approver or admin role
    if (pathname.startsWith('/client')) {
      if (!['admin', 'client_approver'].includes(role)) {
        const url = request.nextUrl.clone()
        url.pathname = getDashboardForRole(role)
        return NextResponse.redirect(url)
      }
    }

    // /employee/*, /timesheet/*, /expense/*, /dashboard/*: any authenticated user is fine
    // (already handled by the auth check above)
  }

  return supabaseResponse
}

function getDashboardForRole(role: string): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'manager':
    case 'time_approver':
      return '/manager/pending'
    case 'client_approver':
      return '/client'
    default:
      return '/dashboard'
  }
}
