import { NextResponse } from 'next/server';

export async function GET() {
  // Check if running in GitHub Codespaces
  const isCodespaces = typeof process.env.CODESPACE_NAME === 'string' && 
                       process.env.CODESPACE_NAME.length > 0;
                       
  // Determine API URL based on environment
  let apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  
  if (!apiUrl) {
    const protocol = process.env.NEXT_PUBLIC_API_PROTOCOL || 'http';
    const hostname = process.env.NEXT_PUBLIC_API_HOSTNAME || 'localhost';
    const port = process.env.NEXT_PUBLIC_API_PORT || '8000';
    
    // In Codespaces, port is included in hostname
    apiUrl = port 
      ? `${protocol}://${hostname}:${port}`
      : `${protocol}://${hostname}`;
  }

  // Only expose specific environment variables to the frontend
  const envVars = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    API_URL: apiUrl,
    APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
    DEBUG_MODE: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
    IS_CODESPACES: isCodespaces
  };

  return NextResponse.json(envVars);
} 