// Environment variable utilities

interface EnvVariables {
  NODE_ENV: string;
  API_URL: string;
  APP_VERSION: string;
  DEBUG_MODE: boolean;
}

interface ApiStatus {
  services: {
    image_generation: boolean;
    llm: boolean;
    storage: boolean;
  };
  providers: {
    using_azure_openai: boolean;
    using_direct_openai: boolean;
  };
  summary: {
    all_services_ready: boolean;
    image_generation_client: string;
    llm_client: string;
    storage: string;
  };
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
    return {
      NODE_ENV: process.env.NODE_ENV || 'development',
      API_URL: '',
      APP_VERSION: '0.0.0',
      DEBUG_MODE: false
    };
  }
}

export async function getApiStatus(): Promise<ApiStatus | null> {
  try {
    const response = await fetch('http://127.0.0.1:8000/api/v1/env/status');
    if (!response.ok) {
      throw new Error('Failed to fetch API status');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching API status:', error);
    return null;
  }
} 