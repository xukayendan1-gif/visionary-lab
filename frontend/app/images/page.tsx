"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Loader2, RefreshCw, Clock, ImageIcon, Trash2, Download, X, Plus, FolderUp, Tag, FileText, Info, ExternalLink, MessagesSquare, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { fetchImages } from "@/utils/gallery-utils";
import { MediaType, deleteGalleryAsset, analyzeImage, updateAssetMetadata, ImageAnalysisResponse, API_BASE_URL, fetchFolders, moveAsset } from "@/services/api";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { ImageGalleryCard } from "@/components/image-gallery-card";
import { ImageCreationContainer } from "@/components/ImageCreationContainer";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSearchParams } from "next/navigation";
import { FolderIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ImageMetadata {
  src: string;
  title: string;
  description?: string;
  id: string;
  name: string;
  tags?: string[];
  originalItem: any;
  width?: number;
  height?: number;
  size?: "small" | "medium" | "large";
}

export default function NewImagePage() {
  const searchParams = useSearchParams();
  const folderPath = searchParams.get('folder');
  
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [lastRefreshedText, setLastRefreshedText] = useState<string>("Never refreshed");
  const [selectedImage, setSelectedImage] = useState<ImageMetadata | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResponse | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<ImageMetadata | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isMovingFullscreen, setIsMovingFullscreen] = useState(false);
  const [folders, setFolders] = useState<string[]>([]);
  const [isFoldersLoading, setIsFoldersLoading] = useState(false);
  const limit = 50;

  // Log changes to fullscreenImage dimensions
  useEffect(() => {
    if (fullscreenImage) {
      console.log("FullscreenImage updated:", {
        id: fullscreenImage.id,
        width: fullscreenImage.width,
        height: fullscreenImage.height
      });
    }
  }, [fullscreenImage]);

  const loadImages = useCallback(async (resetImages = true, isAutoRefresh = false) => {
    if (resetImages) {
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
      // Fetch images - they will be sorted by creation time (newest first) in the fetchImages function
      const fetchedImages = await fetchImages(limit, resetImages ? 0 : offset, folderPath || undefined);
      
      if (resetImages) {
        setImages(fetchedImages);
        
        // Update last refreshed time
        const now = new Date();
        setLastRefreshed(now);
        setLastRefreshedText(`Last refreshed ${formatDistanceToNow(now, { addSuffix: true })}`);
      } else {
        setImages(prevImages => [...prevImages, ...fetchedImages]);
      }
      
      // If we got fewer images than the limit, there are no more images to load
      setHasMore(fetchedImages.length >= limit);
      
      // Update offset for next page
      if (!resetImages) {
        setOffset(prevOffset => prevOffset + limit);
      }
    } catch (error) {
      console.error("Failed to load images:", error);
      toast.error("Error loading images", {
        description: "Failed to load images from the gallery"
      });
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  }, [limit, offset, folderPath]);

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh(prev => !prev);
  };

  // Handle auto refresh toggle
  useEffect(() => {
    if (autoRefresh) {
      // Set up a refresh interval (every 30 seconds)
      const interval = setInterval(() => {
        loadImages(true, true);
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
  }, [autoRefresh, loadImages]);

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

  // Reset images and reload when folder path changes
  useEffect(() => {
    setOffset(0);
    setImages([]);
    loadImages(true);
  }, [folderPath, loadImages]);

  // Function to handle image deletion
  const handleImageDeleted = async (image: ImageMetadata) => {
    setIsDeleting(true);
    try {
      await deleteGalleryAsset(image.name, MediaType.IMAGE);
      
      // Remove the deleted image from the state
      setImages(prevImages => prevImages.filter(img => img.id !== image.id));
      
      toast.success("Image deleted successfully");
      
      // If we've deleted an image, we might want to load another one to replace it
      if (hasMore && images.length < limit * 2) {
        loadMoreImages();
      }
    } catch (error) {
      console.error("Failed to delete image:", error);
      toast.error("Error deleting image", {
        description: "Failed to delete image from the gallery"
      });
    } finally {
      setIsDeleting(false);
      setSelectedImage(null);
    }
  };

  // Function to load more images
  const loadMoreImages = () => {
    if (!hasMore || isLoadingMore) return;
    loadImages(false);
  };

  // Generate skeleton placeholders for loading state
  const renderSkeletons = (count: number) => {
    return Array.from({ length: count }).map((_, index) => (
      <div 
        key={`skeleton-${index}`}
        className="break-inside-avoid mb-4"
      >
        <Card className="overflow-hidden border-0 rounded-xl h-full w-full">
          <AspectRatio ratio={
            index % 5 === 0 
              ? 16/9  // Landscape ratio for large items
              : index % 3 === 0 
                ? 3/4  // Portrait ratio for tall items
                : 4/3  // Standard ratio for medium items
          } className="bg-muted">
            <Skeleton className="h-full w-full rounded-none" />
          </AspectRatio>
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </Card>
      </div>
    ));
  };

  // Function to handle image click - Opens the full-screen modal
  const handleImageClick = (image: ImageMetadata) => {
    // Create a copy of the image for state update
    const updatedImage = { ...image };
    
    // Try to get image dimensions if not already available
    if (!updatedImage.width || !updatedImage.height) {
      // Create a temporary image to get dimensions
      const tempImg = new window.Image();
      
      // Add crossOrigin attribute to prevent CORS issues
      tempImg.crossOrigin = "anonymous";
      
      // Set up load event to capture dimensions
      tempImg.onload = () => {
        updatedImage.width = tempImg.width;
        updatedImage.height = tempImg.height;
        console.log("Image loaded with dimensions:", tempImg.width, "x", tempImg.height);
        setSelectedImage(updatedImage);
      };
      
      // Add timestamp to URL to prevent caching issues
      const cacheBuster = `${image.src.includes('?') ? '&' : '?'}_t=${Date.now()}`;
      
      // Use a specific proxy route for transparent PNGs if needed
      const hasTransparency = image.originalItem?.metadata?.has_transparency === "true";
      if (hasTransparency && image.originalItem?.url) {
        console.log("Image has transparency, using original URL for dimension extraction");
        // Try the original URL directly for dimension extraction
        tempImg.src = image.originalItem.url + cacheBuster;
      } else {
        // Use the normal image src
        tempImg.src = image.src + cacheBuster;
      }
    }
    
    // Find the index of the clicked image
    const imageIndex = images.findIndex(img => img.id === image.id);
    console.log("Image index:", imageIndex);
    
    setFullscreenImage(updatedImage);
    
    // Check if the image already has analysis data in its metadata
    if (updatedImage.originalItem?.metadata) {
      try {
        const metadata = updatedImage.originalItem.metadata;
        
        // Check if the image has analysis data - either by the analyzed flag or by checking for description/tags
        if (metadata.analyzed === "true" || metadata.description || metadata.tags) {
          // For tags, try to parse them if they exist and are stored as a string
          let parsedTags = [];
          if (metadata.tags) {
            try {
              // Check if tags is already an array or a JSON string
              parsedTags = typeof metadata.tags === 'string' ? JSON.parse(metadata.tags) : metadata.tags;
            } catch (tagError) {
              console.warn("Could not parse tags from metadata:", tagError);
              // If parsing fails, use empty array
              parsedTags = [];
            }
          }
          
          setAnalysisResult({
            description: metadata.description || "",
            products: metadata.products || "None",
            tags: parsedTags,
            feedback: metadata.feedback || ""
          });
          
          console.log("Found analysis data in metadata:", {
            description: metadata.description?.substring(0, 50) + "...",
            products: metadata.products,
            tagCount: parsedTags.length,
            feedback: metadata.feedback?.substring(0, 50) + "..."
          });
        } else {
          // Reset analysis results when opening a new unanalyzed image
          setAnalysisResult(null);
        }
      } catch (error) {
        console.error("Error parsing image metadata:", error);
        // If there was an error parsing the metadata, reset analysis results
        setAnalysisResult(null);
      }
    } else {
      // Reset analysis results when opening a new image without metadata
      setAnalysisResult(null);
    }
  };

  // Function to navigate to the previous/next image
  const navigateImage = (direction: 'prev' | 'next') => {
    if (!fullscreenImage || images.length === 0) return;
    
    // Set loading state when navigating
    setIsImageLoading(true);
    
    // Find the current image index
    const currentIndex = images.findIndex(img => img.id === fullscreenImage.id);
    if (currentIndex === -1) return;
    
    // Calculate the new index with wrapping
    let newIndex;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    } else {
      newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    }
    
    // Set the new fullscreen image
    handleImageClick(images[newIndex]);
  };

  // Function to handle image analysis
  const handleAnalyzeImage = async () => {
    if (!fullscreenImage) return;

    try {
      setIsAnalyzing(true);
      toast("Analyzing image...", {
        description: "This may take a moment"
      });

      // Debug information to help diagnose issues
      console.log("Image metadata:", {
        id: fullscreenImage.id,
        name: fullscreenImage.name,
        src: fullscreenImage.src,
        originalItem: fullscreenImage.originalItem
      });

      // Check if the original item has a valid Azure blob URL
      if (!fullscreenImage.originalItem?.url || !fullscreenImage.originalItem.url.includes('blob.core.windows.net')) {
        console.error("Missing or invalid Azure blob URL:", fullscreenImage.originalItem?.url);
        throw new Error("Image doesn't have a valid Azure blob storage URL");
      }
      
      // Use the original Azure blob URL directly
      const azureUrl = fullscreenImage.originalItem.url;
      console.log("Using Azure blob URL for analysis:", azureUrl);
      
      // Directly use the Azure blob URL for analysis
      const result = await analyzeImage(azureUrl);
      setAnalysisResult(result);

      // Update the image metadata on the server
      await updateAssetMetadata(
        fullscreenImage.name,
        MediaType.IMAGE,
        {
          description: result.description,
          tags: JSON.stringify(result.tags),
          products: result.products,
          analyzed: "true",
          feedback: result.feedback
        }
      );

      toast.success("Image analysis complete", {
        description: "The analysis has been saved to the image metadata"
      });
      
      // Refresh the images list to get the updated metadata
      await loadImages(true, false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      console.error("Image analysis error:", error);
      toast.error("Error analyzing image", {
        description: errorMessage
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Format file size for display
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Keyboard navigation for fullscreen viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fullscreenImage) return;
      
      if (e.key === 'ArrowLeft') {
        navigateImage('prev');
      } else if (e.key === 'ArrowRight') {
        navigateImage('next');
      } else if (e.key === 'Escape') {
        setFullscreenImage(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenImage, images]);

  // Function to handle moving an image to a folder
  const handleMoveImage = async (image: ImageMetadata, targetFolder: string) => {
    if (!image.name) {
      toast.error("Cannot move image", {
        description: "Missing image filename"
      });
      return;
    }

    try {
      setIsMovingFullscreen(true);
      
      const result = await moveAsset(image.name, targetFolder, MediaType.IMAGE);
      
      if (result.success) {
        // Only remove the image from the list if we're in a folder view
        // In the "All Images" view, the image should still be visible
        if (folderPath) {
          // Remove the image from the list
          setImages(prevImages => prevImages.filter(img => img.id !== image.id));
          
          // If we've moved an image, we might want to load another one to replace it
          if (hasMore && images.length < limit * 2) {
            loadMoreImages();
          }
          
          // Close the fullscreen view if the moved image was being viewed
          if (fullscreenImage && fullscreenImage.id === image.id) {
            setFullscreenImage(null);
          }
        } else {
          // When in "All Images" view, we don't remove the image but might want to refresh to update any metadata
          loadImages(true);
        }
        
        toast.success("Image moved", {
          description: `The image was moved to folder "${targetFolder}"`
        });
      } else {
        throw new Error(result.message || "Failed to move image");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error("Error moving image", {
        description: errorMessage
      });
    } finally {
      setIsMovingFullscreen(false);
    }
  };
  
  // Load folders for the dropdown
  const loadFolders = async () => {
    if (folders.length > 0) return; // Only load once
    
    try {
      setIsFoldersLoading(true);
      const result = await fetchFolders(MediaType.IMAGE);
      setFolders(result.folders);
    } catch (error) {
      console.error("Failed to fetch folders:", error);
    } finally {
      setIsFoldersLoading(false);
    }
  };

  // Function to load only the newest images and update the gallery
  const loadNewImages = useCallback(async (count: number = 5) => {
    // Let's just do a complete reload but with better UX - loading in the background
    const tempLoading = isRefreshing;
    setIsRefreshing(true);
    
    try {
      // Remember current scroll position
      const galleryContainer = document.querySelector('.gallery-container');
      const scrollPosition = galleryContainer?.scrollTop || 0;
      
      console.log(`Reloading gallery after generating ${count} new images`);
      
      // Simply get the updated list of images
      const fetchedImages = await fetchImages(limit, 0, folderPath || undefined);
      
      if (fetchedImages.length > 0) {
        // Instead of trying to compare and merge, just set the new images
        setImages(fetchedImages);
        
        // Update last refreshed time
        const now = new Date();
        setLastRefreshed(now);
        setLastRefreshedText(`Last refreshed ${formatDistanceToNow(now, { addSuffix: true })}`);
        
        // Toast notification
        toast.success(`Gallery updated with ${count} new image${count > 1 ? 's' : ''}`, {
          description: "New images have been added to the gallery"
        });
        
        // Restore scroll position after a short delay to ensure rendering is complete
        setTimeout(() => {
          if (galleryContainer) {
            galleryContainer.scrollTop = scrollPosition;
          }
        }, 100);
      }
    } catch (error) {
      console.error("Failed to reload gallery with new images:", error);
      toast.error("Error updating gallery", {
        description: "Failed to load newly generated images"
      });
    } finally {
      setIsRefreshing(tempLoading);
    }
  }, [limit, folderPath, isRefreshing]);

  return (
    <div className="flex flex-col h-full w-full">
      <PageHeader 
        title="Explore" 
      />
      
      <div className="flex-1 w-full h-full overflow-y-auto gallery-container">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground">
                {lastRefreshedText}
              </div>
              {folderPath && (
                <Badge variant="outline" className="ml-2">
                  <FolderIcon className="h-3 w-3 mr-1" />
                  {folderPath}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
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
                onClick={() => loadImages(true)}
                disabled={loading || isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="sr-only">Refresh gallery</span>
              </Button>
            </div>
          </div>
          
          {loading ? (
            <div className="w-full">
              <div className="columns-1 sm:columns-2 md:columns-2 lg:columns-3 gap-4 space-y-4">
                {renderSkeletons(16)}
              </div>
            </div>
          ) : images.length > 0 ? (
            <div className="w-full">
              {/* Masonry grid using CSS columns instead of grid for better space filling */}
              <div 
                className="columns-1 sm:columns-2 md:columns-2 lg:columns-3 gap-4 space-y-4"
              >
                {images.map((image, index) => (
                  <div key={image.id} className="break-inside-avoid mb-4">
                    <ImageGalleryCard
                      image={image}
                      index={index}
                      onClick={() => handleImageClick(image)}
                      onDelete={(deletedImageId) => {
                        // Remove the deleted image from the state
                        setImages(prevImages => prevImages.filter(img => img.id !== deletedImageId));
                        
                        // If we've deleted an image, we might want to load another one to replace it
                        if (hasMore && images.length < limit * 2) {
                          loadMoreImages();
                        }
                      }}
                      onMove={(movedImageId) => {
                        // Only remove the moved image if we're in a folder view
                        if (folderPath) {
                          // Remove the moved image from the current state
                          setImages(prevImages => prevImages.filter(img => img.id !== movedImageId));
                          
                          // If we've moved an image, we might want to load another one to replace it
                          if (hasMore && images.length < limit * 2) {
                            loadMoreImages();
                          }
                        } else {
                          // When in "All Images" view, refresh the gallery to update
                          loadImages(true);
                        }
                        
                        toast.success("Image moved", {
                          description: "The image was moved to another folder"
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
              
              {/* Load more button */}
              {hasMore && (
                <div className="mt-8 flex justify-center">
                  <Button
                    onClick={loadMoreImages}
                    disabled={isLoadingMore}
                    variant="outline"
                    className="px-8"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More Images'
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-14rem)] py-20 text-muted-foreground">
              <ImageIcon className="h-16 w-16 mb-4 opacity-20" />
              {folderPath ? (
                <>
                  <p className="text-xl">No images found in this folder</p>
                  <p className="text-sm mt-2">The folder "{folderPath}" is empty</p>
                </>
              ) : (
                <>
                  <p className="text-xl">No images found in the gallery</p>
                  <p className="text-sm mt-2">Upload some images to get started</p>
                </>
              )}
              <Button 
                onClick={() => loadImages(true)} 
                variant="outline" 
                className="mt-6"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Gallery
              </Button>
            </div>
          )}
        </div>
        
        {/* Image Creation Container - sticky positioned at the bottom */}
        <div className="sticky bottom-0 w-full">
          <ImageCreationContainer 
            onImagesSaved={(count) => loadNewImages(count || 5)} 
          />
        </div>
      </div>
      
      {/* Full-screen Image Viewer Modal */}
      {fullscreenImage && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-background w-full max-w-[90vw] max-h-[90vh] rounded-xl shadow-md flex flex-col">
            {/* Header - modified to include navigation arrows instead of title */}
            <div className="flex items-center justify-between p-4 bg-background z-10">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateImage('prev')}
                  className="h-8 w-8"
                  disabled={isImageLoading}
                >
                  <ChevronLeft className="h-5 w-5" />
                  <span className="sr-only">Previous image</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateImage('next')}
                  className="h-8 w-8"
                  disabled={isImageLoading}
                >
                  <ChevronRight className="h-5 w-5" />
                  <span className="sr-only">Next image</span>
                </Button>
                {isImageLoading && (
                  <div className="ml-2 flex items-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Loading image...</span>
                  </div>
                )}
              </div>
              
              {/* Display prompt in the header */}
              {fullscreenImage.originalItem?.metadata?.prompt && (
                <div className="hidden md:block max-w-lg overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium">
                  {fullscreenImage.originalItem.metadata.prompt}
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="h-8 w-8"
                  disabled={isImageLoading}
                >
                  <a 
                    href={fullscreenImage.src} 
                    download={fullscreenImage.name}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-4 w-4" />
                    <span className="sr-only">Download</span>
                  </a>
                </Button>
                
                <DropdownMenu onOpenChange={(open) => open && loadFolders()}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      disabled={isMovingFullscreen || isImageLoading}
                    >
                      {isMovingFullscreen ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FolderUp className="h-4 w-4" />
                      )}
                      <span className="sr-only">Move to folder</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isFoldersLoading ? (
                      <DropdownMenuItem disabled>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading folders...
                      </DropdownMenuItem>
                    ) : folders.length > 0 ? (
                      folders.map((folder) => (
                        <DropdownMenuItem
                          key={folder}
                          onClick={() => handleMoveImage(fullscreenImage, folder)}
                        >
                          {folder || "Root"}
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem disabled>
                        No folders available
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    handleImageDeleted(fullscreenImage);
                    setFullscreenImage(null);
                  }}
                  disabled={isDeleting || isImageLoading}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span className="sr-only">Delete</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setFullscreenImage(null)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left side - Image with improved container */}
              <div className="w-full md:w-2/3 flex-shrink-0 flex items-center justify-center p-4 md:p-6">
                <div className="relative w-full h-full flex items-center justify-center rounded-lg overflow-hidden">
                  {/* Container with better responsiveness */}
                  <div className="w-full h-full flex items-center justify-center rounded-xl overflow-hidden" 
                       style={{
                         height: "calc(90vh - 12rem)",
                         minHeight: "500px"
                       }}>
                    <div className="relative flex items-center justify-center h-full w-full">
                      {/* Loading indicator */}
                      <div 
                        className={`absolute inset-0 bg-muted/20 rounded-xl flex items-center justify-center ${isImageLoading ? 'flex' : 'hidden'}`}
                      >
                        {isImageLoading && (
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">Loading image...</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Image itself - improved scaling to fit container while maintaining aspect ratio */}
                      {fullscreenImage.width && fullscreenImage.height ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                          {/* Checkerboard background for transparent images */}
                          {fullscreenImage.originalItem?.metadata?.has_transparency === "true" && (
                            <div 
                              className="absolute inset-0 rounded-xl" 
                              style={{ 
                                backgroundImage: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
                                backgroundSize: '20px 20px',
                                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                                opacity: 0.3,
                                zIndex: 0
                              }}
                            />
                          )}
                          <div className="w-full h-full flex items-center justify-center">
                            <Image
                              src={fullscreenImage.src}
                              alt={fullscreenImage.title || "Gallery image"}
                              width={fullscreenImage.width}
                              height={fullscreenImage.height}
                              className="rounded-xl transition-opacity duration-300 ease-in-out z-10 relative"
                              style={{ 
                                objectFit: "contain",
                                width: "100%", 
                                height: "100%",
                                maxWidth: "100%",
                                maxHeight: "100%",
                                transition: "all 0.2s ease-in-out",
                                opacity: isImageLoading ? 0 : 1
                              }}
                              priority
                              loading="eager"
                              quality={90}
                              onLoad={(e) => {
                                const img = e.target as HTMLImageElement;
                                // Ensure image has fully loaded
                                if (img.complete) {
                                  // Clear loading state after image loads
                                  setIsImageLoading(false);
                                  
                                  // Update dimensions if needed
                                  if (img.naturalWidth && img.naturalHeight && 
                                      (!fullscreenImage.width || !fullscreenImage.height)) {
                                    setFullscreenImage({
                                      ...fullscreenImage,
                                      width: img.naturalWidth,
                                      height: img.naturalHeight
                                    });
                                    console.log("Updated image dimensions from loaded image:", {
                                      width: img.naturalWidth,
                                      height: img.naturalHeight
                                    });
                                  }
                                }
                              }}
                              onError={() => {
                                console.error("Error loading image in fullscreen view:", fullscreenImage.src);
                                // If the normal image fails, try using the original URL
                                if (fullscreenImage.originalItem?.url && !fullscreenImage.src.includes(fullscreenImage.originalItem.url)) {
                                  console.log("Trying original URL as fallback:", fullscreenImage.originalItem.url);
                                  // Create a new image with the originalItem URL
                                  const updatedImage = {
                                    ...fullscreenImage,
                                    src: fullscreenImage.originalItem.url
                                  };
                                  setFullscreenImage(updatedImage);
                                }
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-full h-full flex items-center justify-center">
                          {/* Checkerboard background for transparent images */}
                          {fullscreenImage.originalItem?.metadata?.has_transparency === "true" && (
                            <div 
                              className="absolute inset-0 rounded-xl" 
                              style={{ 
                                backgroundImage: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
                                backgroundSize: '20px 20px',
                                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                                opacity: 0.3,
                                zIndex: 0
                              }}
                            />
                          )}
                          <div className="w-full h-full flex items-center justify-center">
                            <Image
                              src={fullscreenImage.src}
                              alt={fullscreenImage.title || "Gallery image"}
                              width={1024}
                              height={768}
                              className="rounded-xl transition-opacity duration-300 ease-in-out z-10 relative"
                              style={{ 
                                objectFit: "contain",
                                width: "100%", 
                                height: "100%",
                                maxWidth: "100%",
                                maxHeight: "100%",
                                transition: "all 0.2s ease-in-out",
                                opacity: isImageLoading ? 0 : 1
                              }}
                              priority
                              loading="eager"
                              quality={90}
                              onLoad={(e) => {
                                const img = e.target as HTMLImageElement;
                                if (img.complete) {
                                  // Clear loading state after image loads
                                  setIsImageLoading(false);
                                  
                                  if (img.naturalWidth && img.naturalHeight) {
                                    setFullscreenImage({
                                      ...fullscreenImage,
                                      width: img.naturalWidth,
                                      height: img.naturalHeight
                                    });
                                    console.log("Updated image dimensions from fallback image:", {
                                      width: img.naturalWidth,
                                      height: img.naturalHeight
                                    });
                                  }
                                }
                              }}
                              onError={() => {
                                console.error("Error loading image in fullscreen view:", fullscreenImage.src);
                                // If the normal image fails, try using the original URL
                                if (fullscreenImage.originalItem?.url && !fullscreenImage.src.includes(fullscreenImage.originalItem.url)) {
                                  console.log("Trying original URL as fallback:", fullscreenImage.originalItem.url);
                                  // Create a new image with the originalItem URL
                                  const updatedImage = {
                                    ...fullscreenImage,
                                    src: fullscreenImage.originalItem.url
                                  };
                                  setFullscreenImage(updatedImage);
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right side - Metadata with Cards */}
              <div className="w-full md:w-1/3 flex-shrink-0 flex flex-col">
                <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: "calc(90vh - 12rem)" }}>
                  {/* Prompt Card */}
                  {fullscreenImage.originalItem?.metadata?.prompt && (
                    <Card className="mb-4 rounded-lg overflow-hidden border bg-card">
                      <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-sm font-medium flex items-center">
                          <MessageSquare className="h-4 w-4 mr-2 text-primary" />
                          Prompt
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3 pt-0">
                        <p className="text-sm leading-relaxed text-card-foreground">{fullscreenImage.originalItem.metadata.prompt}</p>
                      </CardContent>
                    </Card>
                  )}
                  
                  <Card className="mb-4 rounded-lg overflow-hidden border bg-card">
                    <CardHeader className="pb-2 pt-3 px-4">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <Info className="h-4 w-4 mr-2 text-primary" />
                        Image Information
                      </CardTitle>
                      <CardDescription className="text-xs">Details about this image file</CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 pt-0">
                      <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-sm">
                        <div className="text-muted-foreground">File name:</div>
                        <div className="font-medium truncate">{fullscreenImage.name}</div>
                        
                        <div className="text-muted-foreground">Format:</div>
                        <div className="font-medium">{fullscreenImage.name.split('.').pop()?.toUpperCase() || 'Unknown'}</div>
                        
                        <div className="text-muted-foreground">File Size:</div>
                        <div className="font-medium">{formatFileSize(fullscreenImage.originalItem?.size)}</div>
                        
                        <div className="text-muted-foreground">Dimensions:</div>
                        <div className="font-medium">
                          {fullscreenImage.width && fullscreenImage.height 
                            ? `${fullscreenImage.width} × ${fullscreenImage.height}px` 
                            : fullscreenImage.src 
                              ? 'Loading...' 
                              : 'Unknown'}
                        </div>
                        
                        <div className="text-muted-foreground">Uploaded:</div>
                        <div className="font-medium">
                          {fullscreenImage.originalItem?.creation_time 
                            ? formatDistanceToNow(new Date(fullscreenImage.originalItem.creation_time), { addSuffix: true })
                            : 'Unknown'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Analysis section */}
                  <div className="flex justify-between items-center py-2 mb-3">
                    <h3 className="text-base font-medium flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-primary" />
                      AI Analysis
                    </h3>
                    <Button
                      size="sm"
                      onClick={handleAnalyzeImage}
                      disabled={isAnalyzing}
                      variant="outline"
                      className="h-8"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1.5" />
                          Analyze
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {analysisResult ? (
                    <div className="space-y-4">
                      {analysisResult.description && (
                        <Card className="rounded-lg overflow-hidden border bg-card">
                          <CardHeader className="pb-2 pt-3 px-4">
                            <CardTitle className="text-sm font-medium">Description</CardTitle>
                          </CardHeader>
                          <CardContent className="px-4 pb-3 pt-0">
                            <p className="text-sm leading-relaxed text-card-foreground">{analysisResult.description}</p>
                          </CardContent>
                        </Card>
                      )}
                      
                      {analysisResult.products && analysisResult.products !== "None" && (
                        <Card className="rounded-lg overflow-hidden border bg-card">
                          <CardHeader className="pb-2 pt-3 px-4">
                            <CardTitle className="text-sm font-medium">Products & Brands</CardTitle>
                          </CardHeader>
                          <CardContent className="px-4 pb-3 pt-0">
                            <p className="text-sm leading-relaxed text-card-foreground">{analysisResult.products}</p>
                          </CardContent>
                        </Card>
                      )}
                      
                      {analysisResult.tags && analysisResult.tags.length > 0 && (
                        <Card className="rounded-lg overflow-hidden border bg-card">
                          <CardHeader className="pb-2 pt-3 px-4">
                            <CardTitle className="text-sm font-medium flex items-center">
                              <Tag className="h-4 w-4 mr-2 text-primary" />
                              Tags
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="px-4 pb-3 pt-0">
                            <div className="flex flex-wrap gap-1.5">
                              {analysisResult.tags.map((tag, index) => (
                                <Badge 
                                  key={index} 
                                  variant="secondary"
                                  className="flex items-center gap-1 text-xs rounded-md"
                                >
                                  <Tag className="h-3 w-3" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      
                      {analysisResult.feedback && (
                        <Card className="rounded-lg overflow-hidden border bg-card">
                          <CardHeader className="pb-2 pt-3 px-4">
                            <CardTitle className="text-sm font-medium flex items-center">
                              <MessagesSquare className="h-4 w-4 mr-2 text-primary" />
                              Feedback
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="px-4 pb-3 pt-0">
                            <p className="text-sm leading-relaxed text-card-foreground">{analysisResult.feedback}</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <Card className="flex flex-col items-center justify-center p-6 text-center border rounded-lg">
                      <MessagesSquare className="h-10 w-10 mb-3 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground mb-1">No analysis data available</p>
                      <p className="text-xs text-muted-foreground/70">
                        Click the Analyze button above to generate insights about this image
                      </p>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 