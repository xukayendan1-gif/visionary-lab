import { useState, useEffect } from 'react';

// Re-export types for other components
export type VideoStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Define the metadata structure
export interface VideoMetadata {
  duration?: number;
  frameCount?: number;
  resolution?: string;
  fps?: number;
  width?: number;
  height?: number;
}

// Define the API job structure
export interface VideoJobData {
  id: string;
  status: string;
  prompt: string;
  n_variants: number;
  n_seconds: number;
  height: number;
  width: number;
  createdAt?: number;
  updatedAt?: number;
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

// Define storage format for queue items
export interface StoredQueueItem {
  id: string;
  prompt: string;
  status: string;
  progress: number;
  thumbnailUrl?: string;
  videoUrl?: string;
  createdAt: string; // Stored as ISO string
  updatedAt: string; // Stored as ISO string
  error?: string;
  metadata?: VideoMetadata;
  job?: VideoJobData;
}

// Define the video queue item structure
export interface VideoQueueItem {
  id: string;
  prompt: string;
  status: VideoStatus;
  progress: number;
  thumbnailUrl?: string;
  videoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
  metadata?: VideoMetadata;
  job?: VideoJobData;
}

/**
 * Standalone hook for managing video queue operations
 * This is a client-side implementation that doesn't rely on the context
 * Use this for simpler implementations or when the context isn't available
 */
export function useStandaloneVideoQueue() {
  const [videoQueue, setVideoQueue] = useState<VideoQueueItem[]>([]);
  
  // Load queue from localStorage on initial render
  useEffect(() => {
    try {
      const savedQueue = localStorage.getItem('videoQueue');
      if (savedQueue) {
        const parsedQueue = JSON.parse(savedQueue);
        // Convert string dates back to Date objects
        const queueWithDates = parsedQueue.map((item: StoredQueueItem) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt)
        }));
        setVideoQueue(queueWithDates);
      }
    } catch (error) {
      console.error('Failed to load video queue from localStorage:', error);
    }
  }, []);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('videoQueue', JSON.stringify(videoQueue));
    } catch (error) {
      console.error('Failed to save video queue to localStorage:', error);
    }
  }, [videoQueue]);

  // Set up polling for updates
  useEffect(() => {
    const pendingOrProcessingItems = videoQueue.filter(
      item => item.status === 'pending' || item.status === 'processing'
    );
    
    if (pendingOrProcessingItems.length === 0) return;
    
    const intervalId = setInterval(() => {
      // In a real app, this would call the API to check for updates
      // For now, we'll simulate progress updates
      setVideoQueue(currentQueue => 
        currentQueue.map(item => {
          if (item.status === 'pending') {
            // Randomly transition from pending to processing
            if (Math.random() > 0.7) {
              return { ...item, status: 'processing', progress: 0, updatedAt: new Date() };
            }
          } else if (item.status === 'processing') {
            // Update progress
            const newProgress = Math.min(item.progress + Math.random() * 10, 100);
            
            // If progress reaches 100, mark as completed
            if (newProgress >= 100) {
              return { 
                ...item, 
                status: 'completed', 
                progress: 100, 
                updatedAt: new Date(),
                videoUrl: 'https://example.com/sample-video.mp4', // Placeholder
                thumbnailUrl: 'https://example.com/sample-thumbnail.jpg', // Placeholder
                metadata: {
                  duration: 15,
                  frameCount: 450,
                  resolution: '720p',
                  fps: 30
                }
              };
            }
            
            return { ...item, progress: newProgress, updatedAt: new Date() };
          }
          
          return item;
        })
      );
    }, 2000);
    
    return () => clearInterval(intervalId);
  }, [videoQueue]);

  // Add a new video to the queue
  const addVideoToQueue = (prompt: string) => {
    const newItem: VideoQueueItem = {
      id: Date.now().toString(),
      prompt,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setVideoQueue(currentQueue => [...currentQueue, newItem]);
    return newItem.id;
  };

  // Remove a video from the queue
  const removeVideoQueueItem = (id: string) => {
    setVideoQueue(currentQueue => currentQueue.filter(item => item.id !== id));
  };

  // Download a video
  const downloadVideo = async (id: string) => {
    const item = videoQueue.find(item => item.id === id);
    
    if (!item || !item.videoUrl) {
      throw new Error('Video not available for download');
    }
    
    // In a real app, this would trigger the actual download
    // For simulation purposes, we'll just console.log
    console.log(`Downloading video: ${item.videoUrl}`);
    
    // Simulate a download delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return true;
  };

  return {
    videoQueue,
    addVideoToQueue,
    removeVideoQueueItem,
    downloadVideo,
    // Add getQueueItem for compatibility with the context API
    getQueueItem: (id: string) => videoQueue.find(item => item.id === id)
  };
}

// Re-export the context-based hook from video-queue-context
// This allows files to import { useVideoQueue } from this file rather than
// having to update all existing imports
export { useVideoQueue } from '../context/video-queue-context'; 