"use client"

import { usePathname, useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState, useRef } from "react"
import { useJobs } from "@/context/jobs-context"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function RefreshJobsButton() {
  const pathname = usePathname()
  const router = useRouter()
  const { refreshJobs } = useJobs()
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const isMountedRef = useRef(false)

  const isJobsPage = pathname.includes("/jobs")
  const isMainJobsPage = pathname === "/jobs" || pathname === "/jobs/"

  // Only show the component after client-side hydration is complete
  useEffect(() => {
    isMountedRef.current = true
    // Use setTimeout to avoid state updates during render
    setTimeout(() => {
      if (isMountedRef.current) {
        setMounted(true)
      }
    }, 0)
    
    return () => {
      isMountedRef.current = false
    }
  }, [])

  if (!mounted) {
    return null
  }

  // Only show on jobs-related pages but not on the main jobs page (since it has its own refresh button)
  if (!isJobsPage || isMainJobsPage) {
    return null
  }

  const handleRefresh = async () => {
    if (isLoading) return
    
    // Use setTimeout to avoid state updates during render
    setTimeout(() => {
      if (isMountedRef.current) {
        setIsLoading(true)
      }
    }, 0)
    
    try {
      console.log("Refreshing jobs from header button...")
      
      // First try to use the refresh handler if available
      try {
        await refreshJobs()
        console.log("Jobs refreshed successfully via handler")
      } catch {
        console.log("Using router.refresh() as fallback")
        // If that fails, just refresh the page as a fallback
        router.refresh()
      }
    } catch (error) {
      console.error("Error refreshing jobs:", error)
    } finally {
      // Use setTimeout to avoid state updates during render
      setTimeout(() => {
        if (isMountedRef.current) {
          setIsLoading(false)
        }
      }, 0)
    }
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
            className="mr-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh jobs</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Refresh jobs
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 