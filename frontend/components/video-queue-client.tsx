"use client";

import { useVideoQueue } from "@/context/video-queue-context";
import { VideoQueueDropdown } from "@/components/video-queue-dropdown";
import { useState, useEffect } from "react";

export function VideoQueueClient() {
  const { queueItems } = useVideoQueue();
  const [mounted, setMounted] = useState(false);

  // Only show the component after client-side hydration is complete
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder with the same size/structure during SSR
    return (
      <div className="w-8 h-8" aria-hidden="true" />
    );
  }

  return <VideoQueueDropdown queueItems={queueItems} />;
} 