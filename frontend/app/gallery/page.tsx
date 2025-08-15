"use client";

import { useState, useEffect, Suspense } from "react";
import { VideoCard } from "@/components/VideoCard";
import { PageHeader } from "@/components/page-header";
import { fetchVideos, VideoMetadata } from "@/utils/gallery-utils";
import { Loader2, RefreshCw, Clock, Video, VideoOff, FolderIcon, FileVideo, CheckSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { SlideTransition } from "@/components/ui/page-transition";
import { MultiSelectActionBar } from "@/components/multi-select-action-bar";
import { MediaType, deleteMultipleGalleryAssets, moveMultipleAssets } from "@/services/api";

// Component that safely uses useSearchParams
function SearchParamsWrapper({ onFolderChange }: { onFolderChange: (folder: string | null) => void }) {
  const searchParams = useSearchParams();
  const folderParam = searchParams.get('folder');
  
  // Update parent component when folder changes
  useEffect(() => {
    onFolderChange(folderParam);
  }, [folderParam, onFolderChange]);
  
  return null;
}

export default function GalleryPage() {
  const [folderParam, setFolderParam] = useState<string | null>(null);
  
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [lastRefreshedText, setLastRefreshedText] = useState<string>("Never refreshed");
  // Multi-select state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  const limit = 50;

  const loadVideos = async (resetVideos = true, isAutoRefresh = false) => {
    if (resetVideos) {
      if (!isAutoRefresh) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setOffset(0);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const fetchedVideos = await fetchVideos(limit, resetVideos ? 0 : offset, folderParam || undefined);
      
      if (resetVideos) {
        setVideos(fetchedVideos);
        
        // Update last refreshed time
        const now = new Date();
        setLastRefreshed(now);
        setLastRefreshedText(`Last refreshed ${formatDistanceToNow(now, { addSuffix: true })}`);
      } else {
        setVideos(prevVideos => [...prevVideos, ...fetchedVideos]);
      }
      
      // If we got fewer videos than the limit, there are no more videos to load
      setHasMore(fetchedVideos.length >= limit);
      
      // Update offset for next page
      if (!resetVideos) {
        setOffset(prevOffset => prevOffset + limit);
      }
    } catch (error) {
      console.error("Failed to load videos:", error);
      toast.error("Error loading videos", {
        description: "Failed to load videos from the gallery"
      });
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  };

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh(prev => !prev);
  };

  // Toggle auto-play
  const toggleAutoPlay = () => {
    setAutoPlay(prev => !prev);
  };

  // Handle auto refresh toggle
  useEffect(() => {
    if (autoRefresh) {
      // Set up a refresh interval (every 30 seconds)
      const interval = setInterval(() => {
        loadVideos(true, true);
      }, 30000); // 30 seconds
      
      setRefreshInterval(interval);
      
      // Cleanup interval on component unmount or when autoRefresh is turned off
      return () => {
        if (interval) clearInterval(interval);
      };
    } else if (refreshInterval) {
      // Clear the interval if auto refresh is turned off
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [autoRefresh]);

  // Update the "time ago" text every minute
  useEffect(() => {
    if (!lastRefreshed) return;
    
    const updateLastRefreshedText = () => {
      if (lastRefreshed) {
        setLastRefreshedText(`Last refreshed ${formatDistanceToNow(lastRefreshed, { addSuffix: true })}`);
      }
    };
    
    // Update immediately
    updateLastRefreshedText();
    
    // Then update every minute
    const interval = setInterval(updateLastRefreshedText, 60000);
    
    return () => clearInterval(interval);
  }, [lastRefreshed]);

  // When folder parameter changes, reload videos
  useEffect(() => {
    loadVideos(true, false);
  }, [folderParam]);

  // Initial load
  useEffect(() => {
    loadVideos();
  }, []);

  // Function to handle video deletion
  const handleVideoDeleted = (deletedVideoId: string) => {
    // Remove the deleted video from the state
    setVideos(prevVideos => prevVideos.filter(video => video.id !== deletedVideoId));
    
    // If we've deleted a video, we might want to load another one to replace it
    if (hasMore && videos.length < limit * 2) {
      loadMoreVideos();
    }
  };

  // Function to toggle selection mode
  const toggleSelectionMode = () => {
    setSelectionMode(prev => !prev);
    if (selectionMode) {
      // Clear selection when exiting selection mode
      setSelectedItems([]);
    }
  };

  // Function to handle item selection
  const handleItemSelect = (id: string, selected: boolean) => {
    if (selected) {
      // Use Set to ensure uniqueness of ids
      const uniqueSet = new Set([...selectedItems, id]);
      setSelectedItems(Array.from(uniqueSet));
    } else {
      setSelectedItems(prev => prev.filter(itemId => itemId !== id));
    }
  };

  // Function to clear all selected items
  const clearSelection = () => {
    setSelectedItems([]);
  };

  // Function to delete all selected items
  const deleteSelectedItems = async () => {
    if (selectedItems.length === 0) return;
    
    // Get unique selected items
    const uniqueSelectedItems = Array.from(new Set(selectedItems));
    
    // Get blob names from selected item IDs
    const selectedBlobNames = videos
      .filter(video => uniqueSelectedItems.includes(video.id))
      .map(video => video.name);
    
    if (selectedBlobNames.length === 0) {
      toast.error("No valid items to delete");
      return;
    }
    
    const result = await deleteMultipleGalleryAssets(selectedBlobNames, MediaType.VIDEO);
    
    if (result.success) {
      // Remove deleted videos from state
      setVideos(prevVideos => 
        prevVideos.filter(video => !uniqueSelectedItems.includes(video.id))
      );
      
      // Clear selection
      setSelectedItems([]);
      
      // Load more videos if needed
      if (hasMore && videos.length < limit * 2) {
        loadMoreVideos();
      }
    } else {
      toast.error("Error deleting some items", {
        description: result.message
      });
    }
  };

  // Function to move all selected items
  const moveSelectedItems = async (targetFolder: string) => {
    if (selectedItems.length === 0) return;
    
    // Get unique selected items
    const uniqueSelectedItems = Array.from(new Set(selectedItems));
    
    // Get blob names from selected item IDs
    const selectedBlobNames = videos
      .filter(video => uniqueSelectedItems.includes(video.id))
      .map(video => video.name);
    
    if (selectedBlobNames.length === 0) {
      toast.error("No valid items to move");
      return;
    }
    
    const result = await moveMultipleAssets(selectedBlobNames, targetFolder, MediaType.VIDEO);
    
    if (result.success) {
      // Remove moved videos from state
      setVideos(prevVideos => 
        prevVideos.filter(video => !uniqueSelectedItems.includes(video.id))
      );
      
      // Clear selection
      setSelectedItems([]);
      
      // Load more videos if needed
      if (hasMore && videos.length < limit * 2) {
        loadMoreVideos();
      }
    } else {
      toast.error("Error moving some items", {
        description: result.message
      });
    }
  };

  // Function to load more videos
  const loadMoreVideos = () => {
    if (!hasMore || isLoadingMore) return;
    loadVideos(false);
  };

  // Generate skeleton placeholders for loading state
  const renderSkeletons = (count: number) => {
    return Array.from({ length: count }).map((_, index) => (
      <div key={`skeleton-${index}`} className="mb-6">
        <Card className="overflow-hidden bg-black p-0 border-0 rounded-xl">
          <AspectRatio ratio={16/9} className="bg-muted">
            <Skeleton className="h-full w-full rounded-none" />
          </AspectRatio>
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
          </div>
        </Card>
      </div>
    ));
  };

  // Function to generate sample tags for videos
  const generateTagsForVideo = (video: VideoMetadata, index: number): string[] => {
    // If the video already has tags, use those
    if (video.tags && video.tags.length > 0) {
      return video.tags;
    }
    
    // Extract tags from metadata if available
    if (video.originalItem?.metadata?.tags) {
      try {
        const tagString = video.originalItem.metadata.tags;
        if (typeof tagString === 'string') {
          return JSON.parse(tagString);
        }
      } catch (e) {
        console.warn("Failed to parse tags from metadata", e);
      }
    }
    
    // A pool of potential tags
    const tagPool = [
      "AI Generated", "Landscape", "Portrait", "Nature", "Urban", 
      "Abstract", "People", "Architecture", "Animals", "Technology",
      "Cinematic", "Outdoors", "Indoor", "Animation", "Experimental"
    ];
    
    // Deterministic selection based on the video properties
    const selectedTags: string[] = [];
    
    // Add "AI Generated" tag to all videos
    selectedTags.push("AI Generated");
    
    // Add orientation tags based on title or description
    if (video.title.toLowerCase().includes("landscape") || 
        (video.description && video.description.toLowerCase().includes("landscape"))) {
      selectedTags.push("Landscape");
    } else if (video.title.toLowerCase().includes("portrait") || 
              (video.description && video.description.toLowerCase().includes("portrait"))) {
      selectedTags.push("Portrait");
    } else {
      // Use the index to select a tag if none found in title/description
      selectedTags.push(index % 2 === 0 ? "Landscape" : "Portrait");
    }
    
    // Add a content tag based on index
    const contentIndex = (index * 3) % (tagPool.length - 2) + 2; // Skip the first two tags (AI Generated & Landscape/Portrait)
    selectedTags.push(tagPool[contentIndex]);
    
    // Randomly add an extra tag for some videos
    if (index % 3 === 0) {
      const extraIndex = (index * 7) % (tagPool.length - 2) + 2;
      if (tagPool[extraIndex] && !selectedTags.includes(tagPool[extraIndex])) {
        selectedTags.push(tagPool[extraIndex]);
      }
    }
    
    return selectedTags;
  };



  return (
    <SlideTransition>
      <div className="flex flex-col h-full">
        <PageHeader title={folderParam ? `Videos in ${folderParam}` : "All Videos"} />
        
        <div className="flex items-center justify-between px-4 pb-2">
          <div className="text-xs text-muted-foreground">
            {lastRefreshedText}
            {folderParam && (
              <Badge variant="outline" className="ml-2">
                <FolderIcon className="h-3 w-3 mr-1" />
                {folderParam.split('/').pop() || folderParam}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant={selectionMode ? "default" : "outline"}
              size="sm"
              onClick={toggleSelectionMode}
              className="mr-2 font-medium"
              style={{ minWidth: "120px" }}
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              {selectionMode ? 'Cancel Selection' : 'Select Items'}
            </Button>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant={autoRefresh ? "outline" : "ghost"}
                    className={`relative h-8 w-8 ${autoRefresh ? 'border-primary text-primary' : 'text-muted-foreground'}`}
                    onClick={toggleAutoRefresh}
                  >
                    <Clock className="h-4 w-4" />
                    {autoRefresh && (
                      <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                    <span className="sr-only">
                      {autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  {autoRefresh ? 'Auto-refresh every 30s (on)' : 'Auto-refresh every 30s (off)'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => loadVideos(true)}
              disabled={loading || isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="sr-only">Refresh gallery</span>
            </Button>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={autoPlay ? "default" : "outline"}
                    size="icon"
                    onClick={toggleAutoPlay}
                  >
                    {autoPlay ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                    <span className="sr-only">{autoPlay ? 'Disable auto-play' : 'Enable auto-play'}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  {autoPlay ? 'Auto-play videos (on)' : 'Auto-play videos (off)'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <Suspense fallback={null}>
                  <SearchParamsWrapper onFolderChange={setFolderParam} />
                </Suspense>
                
                {/* Show MultiSelectActionBar when items are selected */}
                {selectionMode && selectedItems.length > 0 && (
                  <MultiSelectActionBar 
                    selectedItems={selectedItems}
                    mediaType={MediaType.VIDEO}
                    onClearSelection={clearSelection}
                    onDeleteSelected={deleteSelectedItems}
                    onMoveSelected={moveSelectedItems}
                  />
                )}

                {loading ? (
                  renderSkeletons(12)
                ) : videos.length > 0 ? (
                  videos.map((video, index) => (
                    <VideoCard
                      key={video.id}
                      src={video.src}
                      description={video.description}
                      blobName={video.name}
                      id={video.id}
                      tags={generateTagsForVideo(video, index)}
                      autoPlay={autoPlay}
                      selectionMode={selectionMode}
                      selected={selectedItems.includes(video.id)}
                      onSelect={handleItemSelect}
                      onDelete={() => handleVideoDeleted(video.id)}
                    />
                  ))
                ) : (
                  <div className="col-span-full flex flex-col items-center justify-center py-16 text-center bg-muted rounded-xl">
                    <FileVideo className="h-16 w-16 text-muted-foreground mb-6" />
                    <h3 className="text-xl font-medium mb-2">No Videos Found</h3>
                    <p className="text-muted-foreground max-w-md">
                      There are no videos in this location. You can create a new video using the video generation tool.
                    </p>
                  </div>
                )}
              </div>

              {hasMore && !loading && (
                <div className="flex justify-center mt-8">
                  <Button
                    variant="outline"
                    onClick={loadMoreVideos}
                    disabled={isLoadingMore}
                    className="w-48"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading
                      </>
                    ) : (
                      "Load More"
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SlideTransition>
  );
} 