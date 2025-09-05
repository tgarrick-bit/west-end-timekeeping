import { NextResponse } from 'next/server';

export async function GET(request) {
  console.log('Test API endpoint called!');
  
  return NextResponse.json({
    success: true,
    message: 'Your API is working!',
    timestamp: new Date().toISOString(),
    url: request.url
  });
}