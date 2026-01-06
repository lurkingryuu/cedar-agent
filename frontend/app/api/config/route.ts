import { NextResponse } from 'next/server';

export async function GET() {
  // Return runtime configuration from environment variables
  // This allows the frontend to read config at runtime, not just build time
  return NextResponse.json({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8280/v1',
    apiKey: process.env.NEXT_PUBLIC_API_KEY || '',
  });
}

