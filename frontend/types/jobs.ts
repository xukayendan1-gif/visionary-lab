// VideoJob type corresponds to the VideoGenerationJob in the API
export interface VideoJob {
  id: string;
  status: string;
  prompt: string;
  n_variants: number;
  n_seconds: number;
  height: number;
  width: number;
  generations?: Array<{
    id: string;
    job_id: string;
    created_at: number;
    width: number;
    height: number;
    n_seconds: number;
    prompt: string;
    url: string;
  }>;
  createdAt?: number; // Note: mapped from created_at
  updatedAt?: number; // Note: mapped from finished_at in some cases
  finished_at?: number;
  failure_reason?: string;
}

// Interface for the API's VideoGenerationJob
export interface ApiVideoJob {
  id: string;
  status: string;
  prompt: string;
  n_variants: number;
  n_seconds: number;
  height: number;
  width: number;
  created_at?: number; // Make optional to match VideoGenerationJob in api.ts
  finished_at?: number;
  failure_reason?: string;
  generations?: Array<{
    id: string;
    job_id: string;
    created_at: number;
    width: number;
    height: number;
    n_seconds: number;
    prompt: string;
    url: string;
  }>;
}

// Helper function to convert API VideoGenerationJob to VideoJob
export function convertToVideoJob(apiJob: ApiVideoJob): VideoJob {
  return {
    ...apiJob,
    createdAt: apiJob.created_at,
    updatedAt: apiJob.finished_at || apiJob.created_at,
  };
} 