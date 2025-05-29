"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react"

type JobsContextType = {
  refreshJobs: () => Promise<void>
  setRefreshHandler: (handler: (() => Promise<void>) | null) => void
  hasRefreshHandler: boolean
}

const JobsContext = createContext<JobsContextType>({
  refreshJobs: async () => {},
  setRefreshHandler: () => {},
  hasRefreshHandler: false
})

export const useJobs = () => useContext(JobsContext)

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const [refreshHandler, setRefreshHandlerState] = useState<(() => Promise<void>) | null>(null)
  const [hasHandler, setHasHandler] = useState(false)
  const refreshOperationInProgress = useRef(false)
  const isMounted = useRef(false)

  // This effect safely updates the mount status
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // This effect safely updates the hasHandler state based on the refreshHandler
  useEffect(() => {
    if (isMounted.current) {
      // Use setTimeout to ensure state updates don't happen during render
      setTimeout(() => {
        if (isMounted.current) {
          const handlerExists = !!refreshHandler && typeof refreshHandler === 'function';
          setHasHandler(handlerExists);
          console.log("JobsProvider: refresh handler updated, exists:", handlerExists);
        }
      }, 0);
    }
  }, [refreshHandler]);

  const refreshJobs = useCallback(async () => {
    // Prevent concurrent refresh operations
    if (refreshOperationInProgress.current) {
      console.log("Refresh operation already in progress, skipping");
      return;
    }

    console.log("RefreshJobs called, handler exists:", !!refreshHandler);
    if (refreshHandler && typeof refreshHandler === 'function') {
      try {
        refreshOperationInProgress.current = true;
        await refreshHandler();
        console.log("Refresh handler executed successfully");
      } catch (error) {
        console.error("Error in refresh handler:", error);
        throw error;
      } finally {
        refreshOperationInProgress.current = false;
      }
    } else {
      console.warn("No refresh handler registered or it's not a function");
    }
  }, [refreshHandler]);
  
  const setRefreshHandlerWrapper = useCallback((handler: (() => Promise<void>) | null) => {
    console.log("Setting refresh handler:", !!handler, typeof handler);
    if (isMounted.current) {
      // Use setTimeout to ensure state updates don't happen during render
      setTimeout(() => {
        if (isMounted.current) {
          setRefreshHandlerState(handler);
        }
      }, 0);
    }
  }, []);

  return (
    <JobsContext.Provider value={{ 
      refreshJobs, 
      setRefreshHandler: setRefreshHandlerWrapper,
      hasRefreshHandler: hasHandler
    }}>
      {children}
    </JobsContext.Provider>
  );
} 