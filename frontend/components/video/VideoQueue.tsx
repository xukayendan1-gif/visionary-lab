import React from 'react';
import { useVideoQueue, VideoQueueItem } from '../../hooks/useVideoQueue';
import { useToast } from '../../hooks/useToast';
import { VideoGenerationProgress } from './VideoGenerationProgress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

export interface VideoSettings {
  resolution: string;
  duration: number;
  fps: number;
  variants: number;
}

export function VideoQueue() {
  // The useVideoQueue hook is now re-exported from our standalone implementation
  // This ensures it will use the context if available
  const { queueItems, removeFromQueue, downloadVideo } = useVideoQueue();
  const { toast } = useToast();

  // Filter videos by status
  const activeVideos = queueItems.filter(
    video => video.status === 'pending' || video.status === 'processing'
  );
  const completedVideos = queueItems.filter(video => video.status === 'completed');
  const failedVideos = queueItems.filter(video => video.status === 'failed');

  // Handle download button click
  const handleDownload = async (video: VideoQueueItem) => {
    try {
      // Check if the downloadVideo function is available (it might not be in the context-based implementation)
      if (typeof downloadVideo === 'function') {
        await downloadVideo(video.id);
        toast({
          title: 'Download started',
          description: 'Your video is being downloaded',
        });
      } else {
        // Fallback for context-based implementation that might not have downloadVideo
        toast({
          title: 'Download feature unavailable',
          description: 'The download functionality is not implemented in this version',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Download failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  // Handle cancel/remove button click
  const handleCancel = (video: VideoQueueItem) => {
    // Use either removeFromQueue (context) or removeVideoQueueItem (standalone)
    if (typeof removeFromQueue === 'function') {
      removeFromQueue(video.id);
    } else if (typeof (window as VideoQueueExtensions).removeVideoQueueItem === 'function') {
      (window as VideoQueueExtensions).removeVideoQueueItem(video.id);
    }
    
    toast({
      title: 'Generation cancelled',
      description: `Video "${video.prompt.substring(0, 20)}${video.prompt.length > 20 ? '...' : ''}" removed from queue`,
    });
  };

  interface VideoQueueExtensions extends Window {
    removeVideoQueueItem?: (id: string) => void;
  }

  if (queueItems.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Video Queue</CardTitle>
          <CardDescription>No videos in queue</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32 text-muted-foreground">
          Videos you generate will appear here
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Video Queue</CardTitle>
        <CardDescription>
          {queueItems.length} video{queueItems.length !== 1 ? 's' : ''} in queue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="active">
              In Progress ({activeVideos.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedVideos.length})
            </TabsTrigger>
            <TabsTrigger value="failed">
              Failed ({failedVideos.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {activeVideos.length > 0 ? (
              <div className="space-y-4">
                {activeVideos.map((video) => (
                  <VideoGenerationProgress
                    key={video.id}
                    queueItem={video}
                    onCancel={() => handleCancel(video)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No videos in progress
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {completedVideos.length > 0 ? (
              <div className="space-y-4">
                {completedVideos.map((video) => (
                  <VideoGenerationProgress
                    key={video.id}
                    queueItem={video}
                    onDownload={() => handleDownload(video)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No completed videos
              </div>
            )}
          </TabsContent>

          <TabsContent value="failed">
            {failedVideos.length > 0 ? (
              <div className="space-y-4">
                {failedVideos.map((video) => (
                  <VideoGenerationProgress
                    key={video.id}
                    queueItem={video}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No failed videos
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 