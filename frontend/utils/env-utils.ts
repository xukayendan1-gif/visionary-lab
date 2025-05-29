// Environment variable utilities

interface EnvVariables {
  NODE_ENV: string;
  API_URL: string;
  APP_VERSION: string;
  DEBUG_MODE: boolean;
  IS_CODESPACES: boolean;
}

interface ApiStatus {
  set: string[];
  missing: string[];
}

export async function getEnvironmentVariables(): Promise<EnvVariables> {
  try {
    const response = await fetch('/api/environment');
    if (!response.ok) {
      throw new Error('Failed to fetch environment variables');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching environment variables:', error);
    // Check if running in GitHub Codespaces
    const isCodespaces = typeof process.env.CODESPACE_NAME === 'string' && 
                         process.env.CODESPACE_NAME.length > 0;
                         
    return {
      NODE_ENV: process.env.NODE_ENV || 'development',
      API_URL: '',
      APP_VERSION: '0.0.0',
      DEBUG_MODE: false,
      IS_CODESPACES: isCodespaces
    };
  }
}

export async function getApiStatus(): Promise<ApiStatus | null> {
  try {
    const API_PROTOCOL = process.env.NEXT_PUBLIC_API_PROTOCOL || 'http';
    const API_HOSTNAME = process.env.NEXT_PUBLIC_API_HOSTNAME || '127.0.0.1';
    // For GitHub Codespaces, port is part of the hostname, so this might be empty
    const API_PORT = process.env.NEXT_PUBLIC_API_PORT || '8000';
    
    // Build URL conditionally based on whether port is specified
    const url = API_PORT 
      ? `${API_PROTOCOL}://${API_HOSTNAME}:${API_PORT}/api/v1/env/status`
      : `${API_PROTOCOL}://${API_HOSTNAME}/api/v1/env/status`;
    
    console.log(`Checking API status at: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch API status');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching API status:', error);
    return null;
  }
} 