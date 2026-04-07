import { NextResponse } from 'next/server';
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasService = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Try to actually fetch Supabase
  let fetchResult = 'not tested';
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' }
    });
    fetchResult = `status: ${res.status}`;
  } catch (e: any) {
    fetchResult = `error: ${e.message}`;
  }
  
  return NextResponse.json({
    url: url?.substring(0, 30) + '...',
    hasAnonKey: hasKey,
    hasServiceKey: hasService,
    fetchResult,
    nodeVersion: process.version,
  });
}
