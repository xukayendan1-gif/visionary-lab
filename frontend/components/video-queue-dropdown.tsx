"use client";

import { 
  Layers, 
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";

interface VideoQueueItem {
  id: string;
  prompt: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  createdAt: Date;
}

interface VideoQueueDropdownProps {
  queueItems: VideoQueueItem[];
}

export function VideoQueueDropdown({ queueItems = [] }: VideoQueueDropdownProps) {
  const [timeNow, setTimeNow] = useState<Date | null>(null);
  
  // Update the current time every second to refresh "time ago" calculations
  useEffect(() => {
    setTimeNow(new Date());
    const interval = setInterval(() => {
      setTimeNow(new Date());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const pendingCount = queueItems.filter(
    (item) => item.status === "pending" || item.status === "processing"
  ).length;

  // Don't render if we haven't established client-side time yet
  if (!timeNow) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Layers className="h-[1.2rem] w-[1.2rem]" />
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {pendingCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Video Generation Queue</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {queueItems.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No video generation jobs in queue
          </div>
        ) : (
          queueItems.map((item) => (
            <DropdownMenuItem key={item.id} className="flex flex-col items-start p-2 cursor-default">
              <div className="flex w-full justify-between">
                <span className="font-medium">{item.prompt.substring(0, 30)}...</span>
                <span className="text-xs text-muted-foreground">
                  {formatTimeAgo(item.createdAt, timeNow)}
                </span>
              </div>
              <div className="flex w-full items-center gap-2 mt-1">
                {item.status === "processing" && (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${item.progress || 0}%` }}
                      />
                    </div>
                    <span className="text-xs">{Math.round(item.progress || 0)}%</span>
                  </>
                )}
                {item.status === "pending" && (
                  <span className="text-xs text-muted-foreground">Waiting to process...</span>
                )}
                {item.status === "completed" && (
                  <span className="text-xs text-green-500">Completed</span>
                )}
                {item.status === "failed" && (
                  <span className="text-xs text-red-500">Failed</span>
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Helper function to format time ago
function formatTimeAgo(date: Date, now: Date): string {
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m ago`;
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  } else {
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }
} 