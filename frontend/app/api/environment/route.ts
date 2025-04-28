import { NextResponse } from 'next/server';

export async function GET() {
  // Only expose specific environment variables to the frontend
  const envVars = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
    APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
    DEBUG_MODE: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true'
  };

  return NextResponse.json(envVars);
} 