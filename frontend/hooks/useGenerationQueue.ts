import { useState, useCallback } from 'react';

/**
 * Settings for generation tasks
 */
export interface GenerationSettings {
  [key: string]: string | number | boolean | string[] | Record<string, string> | undefined;
}

/**
 * Queue item for generation tasks
 */
export interface GenerationQueueItem {
  id: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  settings?: GenerationSettings;
  createdAt: Date;
}

/**
 * Hook for managing generation queue operations
 * Extends or complements the video queue context with additional functionality
 */
export function useGenerationQueue() {
  // State to track generation queue items
  const [queueItems, setQueueItems] = useState<GenerationQueueItem[]>([]);
  
  /**
   * Get a generation queue item by ID
   */
  const getGenerationQueueItem = useCallback((id: string) => {
    return queueItems.find(item => item.id === id) || null;
  }, [queueItems]);
  
  /**
   * Add a new item to the generation queue
   */
  const addGenerationQueueItem = useCallback((item: Omit<GenerationQueueItem, 'createdAt'>) => {
    const newItem = {
      ...item,
      createdAt: new Date()
    };
    setQueueItems(prev => [...prev, newItem]);
    return newItem;
  }, []);
  
  /**
   * Update an existing queue item
   */
  const updateGenerationQueueItem = useCallback((id: string, updates: Partial<GenerationQueueItem>) => {
    setQueueItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    );
  }, []);
  
  /**
   * Remove an item from the queue
   */
  const removeGenerationQueueItem = useCallback((id: string) => {
    setQueueItems(prev => prev.filter(item => item.id !== id));
  }, []);
  
  return {
    queueItems,
    getGenerationQueueItem,
    addGenerationQueueItem,
    updateGenerationQueueItem,
    removeGenerationQueueItem,
  };
} 