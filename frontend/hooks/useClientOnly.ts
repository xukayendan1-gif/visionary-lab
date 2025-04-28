import { useState, useEffect } from 'react';

/**
 * Hook to detect if the code is running on the client side
 * Helps prevent hydration issues by ensuring browser-only code
 * only runs in the browser, not during server-side rendering
 * 
 * @returns boolean indicating if we're running on the client
 */
export function useClientOnly(): boolean {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    // This effect only runs in the browser, not during SSR
    setIsClient(true);
  }, []);
  
  return isClient;
} 