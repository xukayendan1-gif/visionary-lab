"use client";

import { useState, useEffect, useCallback } from "react";
import { VideoOverlay } from "./VideoOverlay";
import { AspectRatio } from "./ui/aspect-ratio";
import { cn } from "@/utils/utils";
import { Loader2, Tag, Info } from "lucide-react";
import { useVideoQueue } from "../context/video-queue-context";
import { useImageSettings } from "../context/image-settings-context";
import { 
  downloadVideoGeneration, 
  analyzeVideo, 
  VideoAnalysisResponse,
  protectImagePrompt,
  fetchFolders,
  MediaType
} from "../services/api";
import { toast } from "sonner";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface VideoCreationContainerProps {
  className?: string;
  onVideosSaved?: (count?: number) => void;
}

export function VideoCreationContainer({ className = "", onVideosSaved }: VideoCreationContainerProps) {
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [defaultImage, setDefaultImage] = useState<string>("");
  const [isClient, setIsClient] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [videoAnalysisResult, setVideoAnalysisResult] = useState<VideoAnalysisResponse | null>(null);
  const [originalPrompt, setOriginalPrompt] = useState<string | null>(null);
  
  // Add folder-related state
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("root");
  
  // Get global brand protection settings
  const imageSettings = useImageSettings();
  
  const [settings, setSettings] = useState({
    prompt: "",
    aspectRatio: "16:9",
    resolution: "480p",
    duration: "5s",
    variants: "2",
    modality: "video",
    analyzeVideo: false,
    mode: "dev", // Default to dev mode for local testing
    brandsProtection: "off",
    imageModel: "DALLE3",
    hd: false,
    vivid: false,
    imageSize: "1024x1024",
    brandProtectionModel: "GPT-4o",
    moderationThresholds: {
      hate: "med",
      selfHarm: "med",
      sexual: "med",
      violence: "med",
    },
    saveImages: false,
    imageCache: false,
    folder: "root", // Add default folder
  });

  const { addToQueue, getQueueItem } = useVideoQueue();

  // Mark when client-side rendering is active
  useEffect(() => {
    setIsClient(true);
    // Set initial values only on client-side to prevent hydration mismatch
    setDefaultImage("https://picsum.photos/1280/720");
  }, []);

  // Fetch available folders when component mounts
  useEffect(() => {
    const loadFolders = async () => {
      try {
        const result = await fetchFolders(MediaType.VIDEO);
        setFolders(result.folders);
      } catch (error) {
        console.error("Error loading folders:", error);
      }
    };
    
    // Only load folders on client-side
    if (isClient) {
      loadFolders();
    }
  }, [isClient]);

  // Set a default placeholder video on initial load
  useEffect(() => {
    // Skip during server-side rendering
    if (!isClient) return;
    
    // No need to check for mock videos anymore
  }, [isClient]);

  // Poll for job status and download video when complete
  useEffect(() => {
    if (!isClient) return;
    
    // If no active job ID, make sure generation state is reset
    if (!activeJobId) {
      if (isGenerating) {
        setIsGenerating(false);
      }
      if (downloadStarted) {
        setDownloadStarted(false);
      }
      return;
    }
    
    // We have an active job ID, ensure isGenerating is true
    if (!isGenerating) {
      setIsGenerating(true);
    }
    
    // Check the current job status
    const checkJobStatus = async () => {
      try {
        const job = getQueueItem(activeJobId);
        
        if (!job) return;
        
        // Update generation progress from the queue
        if (job.progress !== undefined) {
          setGenerationProgress(job.progress);
        }
        
        // Only set isGenerating to false when job is complete or failed
        if (job.status === "completed" || job.status === "failed") {
          setIsGenerating(false);
        }
        
        // Check if job is complete
        if (job.status === "completed" && job.job?.generations && job.job.generations.length > 0 && !downloadStarted && !isDownloading) {
          // Set download started flag to prevent multiple download attempts
          setDownloadStarted(true);
          setIsDownloading(true);
          
          try {
            // Only get the first generation for display in the UI
            const mainGeneration = job.job.generations[0];
            const fileName = `${job.prompt.substring(0, 20).replace(/\s+/g, '_')}_${mainGeneration.id}.mp4`;
            
            console.log(`Downloading video ${mainGeneration.id} for UI display only (no upload)`);
            
            // Download just the main video for display - uploads are handled by queue context
            const videoUrl = await downloadVideoGeneration(mainGeneration.id, fileName);
            setGeneratedVideo(videoUrl);
            
            // Analyze the video if needed (only for the main variant)
            if (settings.analyzeVideo && settings.mode === "sora") {
              setIsAnalyzing(true);
              
              try {
                // The backend expects a full path on the server where it can access the video
                const videoServerPath = `/Users/ali/Dev/ip/ai-content-lab/backend/static/videos/${fileName}`;
                
                console.log(`Analyzing video at server path: ${videoServerPath}`);
                const analysisResult = await analyzeVideo(videoServerPath);
                console.log("Analysis result:", analysisResult);
                
                setVideoAnalysisResult(analysisResult);
                
                // Show analysis completion toast
                toast.success("Video analysis complete", {
                  description: "AI analysis has been added to the video metadata."
                });
              } catch (analysisError) {
                console.error("Error analyzing video:", analysisError);
                toast.error("Video analysis failed", {
                  description: "Could not analyze the video content."
                });
              } finally {
                setIsAnalyzing(false);
              }
            }
            
            // Call the onVideosSaved callback if provided - this will trigger when the queue has marked uploads as complete
            if (job.uploadComplete && onVideosSaved) {
              console.log("Videos have been uploaded by queue context, triggering onVideosSaved callback");
              onVideosSaved(job.job.generations.length);
            }
            
            // Finalize the process
            setIsDownloading(false);
            
            // Show success message for the generation
            toast.success(`Your ${settings.modality} has been generated successfully.`);
          } catch (error) {
            console.error("Error processing video generation:", error);
            setIsDownloading(false);
            setActiveJobId(null);
            
            // Use placeholder on error
            toast.error("Could not download the generated video. Using placeholder image instead.");
            setGeneratedVideo(defaultImage);
          }
        }
        
        // Handle failed jobs
        if (job.status === "failed") {
          setIsGenerating(false);
          setActiveJobId(null);
          console.error("Video generation failed");
          // Use fallback on failure as well
          toast.error("The backend API reported that video generation failed. Using placeholder image instead.");
          setGeneratedVideo(defaultImage);
        }
      } catch (error) {
        // Handle any errors that occur during polling
        console.error("Error polling job status:", error);
      }
    };
    
    // Poll for status changes - reduced from 3s to 2s for more responsive updates
    const intervalId = setInterval(checkJobStatus, 2000);
    
    // Initial check
    checkJobStatus();
    
    return () => clearInterval(intervalId);
  }, [activeJobId, isClient, getQueueItem, isGenerating, downloadStarted, isDownloading, settings, defaultImage, onVideosSaved]);

  const handleGenerate = useCallback(async (newSettings: {
    prompt: string;
    aspectRatio: string;
    resolution: string;
    duration: string;
    variants: string;
    modality: string;
    analyzeVideo: boolean;
    mode: string;
    brandsProtection: string;
    imageModel: string;
    hd: boolean;
    vivid: boolean;
    imageSize: string;
    brandProtectionModel: string;
    moderationThresholds: {
      hate: string;
      selfHarm: string;
      sexual: string;
      violence: string;
    };
    saveImages: boolean;
    imageCache: boolean;
    folder?: string;
    brandsList?: string[];
  }) => {
    // Skip if not client-side
    if (!isClient) return;
    
    // Reset state
    setSettings({
      ...newSettings,
      folder: newSettings.folder || "root" // Ensure folder is always defined
    });
    setGeneratedVideo(null);
    setIsGenerating(true);
    setGenerationProgress(0);
    setActiveJobId(null);
    setDownloadStarted(false); // Reset download flag when starting a new generation
    
    // Update selected folder if provided
    if (newSettings.folder) {
      setSelectedFolder(newSettings.folder);
    }
    
    // Store the original prompt
    const originalPrompt = newSettings.prompt;
    
    // Show generation started toast
    toast(`Starting ${newSettings.modality} generation with your prompt...`);
    
    // Apply brand protection if enabled
    let generationPrompt = originalPrompt;

    // Use global brand protection settings from imageSettings instead of local settings
    if (imageSettings.settings.brandsProtection !== "off" && imageSettings.settings.brandsList.length > 0) {
      // Simply log that protection is active and forward to the API
      console.log("🛡️ Brand Protection Activated:", {
        mode: imageSettings.settings.brandsProtection,
        brands: imageSettings.settings.brandsList
      });
      
      toast.info("Brand protection activated", {
        description: `Applying ${imageSettings.settings.brandsProtection} protection for ${imageSettings.settings.brandsList.length} brand${imageSettings.settings.brandsList.length > 1 ? 's' : ''}...`
      });
      
      try {
        // Call the brand protection API - this is the same as in the image workflow
        generationPrompt = await protectImagePrompt(
          originalPrompt,
          imageSettings.settings.brandsList,
          imageSettings.settings.brandsProtection
        );
        
        // Log the resulting prompt
        if (generationPrompt !== originalPrompt) {
          console.log("Original prompt:", originalPrompt);
          console.log("Protected prompt:", generationPrompt);
          
          toast.success("Brand protection applied", {
            description: "The prompt has been modified for brand safety"
          });
        } else {
          toast.info("Brand protection processed", {
            description: "No changes were needed to protect the specified brands"
          });
        }
      } catch (error) {
        console.error('Error applying brand protection:', error);
        toast.error("Brand protection failed", {
          description: "Using original prompt instead"
        });
        // Fallback to original prompt on error
        generationPrompt = originalPrompt;
      }
    }
    
    try {
      if (newSettings.modality === "image") {
        // For image generation, we'll still use the mock approach
        // Add to queue (without real API call)
        await addToQueue(generationPrompt);
        
        // Simulate image generation
        const generationTime = calculateGenerationTime(newSettings);
        
        setTimeout(() => {
          // For image generation, parse dimensions from imageSize
          const [width, height] = newSettings.imageSize.split("x").map(dim => parseInt(dim));
          
          // Add a random seed to prevent caching
          const seed = Math.floor(Math.random() * 1000);
          setGeneratedVideo(`https://picsum.photos/seed/${seed}/${width}/${height}`);
          setIsGenerating(false);
        }, generationTime);
      } else {
        // Check if we're in dev or sora mode
        if (newSettings.mode === "dev") {
          // In dev mode, use a placeholder
          await addToQueue(generationPrompt);
          
          // Simulate video generation
          const generationTime = calculateGenerationTime(newSettings);
          
          setTimeout(() => {
            setGeneratedVideo(defaultImage);
            setIsGenerating(false);
          }, generationTime);
        } else {
          // For real video generation, use the API
          try {
            // Add to queue - this will create the job in the backend
            // Note: we use the protected prompt here
            // First, need to convert string values to numbers for type compatibility
            const videoSettings = {
              resolution: newSettings.resolution,
              duration: parseInt(newSettings.duration.replace('s', ''), 10), // Convert "5s" to 5
              variants: parseInt(newSettings.variants, 10),
              aspectRatio: newSettings.aspectRatio,
              fps: undefined, // Optional
              brandsProtection: newSettings.brandsProtection,
              brandsList: newSettings.brandsList
            };
            
            const jobId = await addToQueue(generationPrompt, videoSettings);
            
            // Set the active job ID to trigger the polling
            setActiveJobId(jobId);
            
            // Make sure we keep isGenerating true until the job is complete
            // Don't rely solely on job status for the generating state
            setIsGenerating(true);
            
            // Store original prompt info for metadata
            if (generationPrompt !== originalPrompt) {
              setOriginalPrompt(originalPrompt);
            }
            
            // Note: The status polling effect will handle the rest of the process
            // including updating the generation progress and downloading the video when done
          } catch (error) {
            console.error("Error starting video generation:", error);
            // On API error, fallback to a placeholder
            setIsGenerating(false);
            toast.error("Could not connect to the backend API. Using placeholder image instead.");
            setTimeout(() => {
              setGeneratedVideo(defaultImage);
            }, 1000);
          }
        }
      }
    } catch (error) {
      console.error("Error during generation:", error);
      setIsGenerating(false);
      toast.error("An error occurred while generating the video. Using placeholder image instead.");
      setTimeout(() => {
        setGeneratedVideo(defaultImage);
      }, 1000);
    }
  }, [isClient, addToQueue, defaultImage]);
  
  // Calculate a reasonable generation time based on settings (for mock generation)
  const calculateGenerationTime = (settings: {
    resolution: string;
    duration: string;
    mode: string;
    modality: string;
    imageModel: string;
    hd: boolean;
  }) => {
    // Base time in milliseconds
    let baseTime = 2000;
    
    if (settings.modality === "image") {
      // Image generation times
      baseTime = 1500;
      
      // DALLE3 takes longer than SD3 (when it's available)
      if (settings.imageModel === "DALLE3") baseTime *= 1.2;
      
      // HD takes longer
      if (settings.hd) baseTime *= 1.5;
    } else {
      // Video generation times (existing logic)
      // Adjust for resolution
      if (settings.resolution === "720p") baseTime *= 1.5;
      if (settings.resolution === "1080p") baseTime *= 2;
      
      // Adjust for duration
      const durationSec = parseInt(settings.duration.replace("s", ""));
      baseTime += durationSec * 100;
    }
    
    // Adjust for mode (Sora would be slower)
    if (settings.mode === "sora") baseTime *= 2;
    
    return baseTime;
  };

  // Function to display analysis results in a dialog
  const renderAnalysisDialog = () => {
    if (!videoAnalysisResult) return null;
    
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70"
          >
            <Info className="mr-2 h-4 w-4" />
            View Analysis
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Video Analysis Results</DialogTitle>
            <DialogDescription>
              AI-powered analysis of your generated video
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Summary</h3>
              <p className="text-sm text-muted-foreground">{videoAnalysisResult.summary}</p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Products/Brands Identified</h3>
              <p className="text-sm text-muted-foreground">{videoAnalysisResult.products}</p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {videoAnalysisResult.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Feedback</h3>
              <p className="text-sm text-muted-foreground">{videoAnalysisResult.feedback}</p>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Handle folder selection and creation
  const handleFolderCreated = (newFolder: string | string[]) => {
    if (Array.isArray(newFolder)) {
      // Update the full folders list
      setFolders(newFolder);
    } else {
      // Single new folder was created
      if (!folders.includes(newFolder)) {
        setFolders(prev => [...prev, newFolder]);
      }
      // Update the selected folder
      setSelectedFolder(newFolder);
      // Update settings
      setSettings(prev => ({
        ...prev,
        folder: newFolder
      }));
    }
  };

  return (
    <div className={cn(
      "relative w-full h-full flex flex-col overflow-hidden border-2 border-gray-500/30 rounded-lg",
      className
    )}>
      {/* Render analysis dialog button if analysis results are available */}
      {videoAnalysisResult && renderAnalysisDialog()}
      
      <div className="flex-1 flex items-center justify-center bg-black">
        <AspectRatio 
          ratio={
            settings.modality === "image"
              ? (settings.imageSize === "1024x768" || settings.imageSize === "1792x1024") 
                ? 4/3 
                : settings.imageSize === "1024x1024" 
                  ? 1 
                  : 9/16
              : settings.aspectRatio === "16:9" 
                ? 16/9 
                : settings.aspectRatio === "4:3" 
                  ? 4/3 
                  : settings.aspectRatio === "1:1" 
                    ? 1 
                    : 9/16
          }
          className="max-h-full max-w-full"
        >
          {/* Render condition for default display state */}
          {generatedVideo ? (
            generatedVideo.endsWith('.mp4') || generatedVideo.startsWith('blob:') ? (
              <video 
                src={generatedVideo} 
                controls
                autoPlay
                loop
                muted
                className="w-full h-full object-contain"
              />
            ) : (
              <img 
                src={generatedVideo} 
                alt="Generated content" 
                className="w-full h-full object-contain"
              />
            )
          ) : isGenerating ? (
            <div className="flex flex-col items-center justify-center w-full h-full p-6 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="text-white/80 font-medium text-lg">
                Generating {settings.modality}...
              </div>
              
              {/* Progress bar */}
              <div className="w-full max-w-md bg-gray-700/40 rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${generationProgress}%` }}
                ></div>
              </div>
              
              <div className="text-white/60 text-sm">
                {settings.mode === "sora" 
                  ? `Using AI to create high-quality ${settings.modality}...` 
                  : `Creating ${settings.modality} with prompt: "${settings.prompt.substring(0, 40)}..."`}
              </div>
            </div>
          ) : isDownloading ? (
            <div className="flex flex-col items-center justify-center w-full h-full p-6 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="text-white/80 font-medium text-lg">
                {isAnalyzing ? "Analyzing your video..." : "Downloading your " + settings.modality + "..."}
              </div>
              <div className="text-white/60 text-sm">
                {isAnalyzing 
                  ? "AI is analyzing the video content to provide insights." 
                  : "The content has been generated successfully and is being downloaded."}
              </div>
            </div>
          ) : defaultImage && isClient ? (
            <div className="relative w-full h-full">
              {/* Default state - show placeholder image */}
              <img 
                src={defaultImage} 
                alt="Default placeholder" 
                className="w-full h-full object-cover opacity-70"
              />
            </div>
          ) : (
            <div className="relative w-full h-full">
              {/* Fallback when no placeholder is available */}
              {defaultImage && (
                <img 
                  src={defaultImage} 
                  alt="Default placeholder" 
                  className="w-full h-full object-cover opacity-30"
                />
              )}
            </div>
          )}
        </AspectRatio>
      </div>
      
      <VideoOverlay 
        onGenerate={handleGenerate} 
        isGenerating={isGenerating || isDownloading}
        onPromptChange={(newPrompt, isEnhanced) => {
          // Update settings.prompt with the new prompt
          setSettings(prev => ({
            ...prev,
            prompt: newPrompt
          }));
          
          // If this is an enhanced prompt and we don't already have an original prompt saved
          if (isEnhanced && !originalPrompt) {
            setOriginalPrompt(settings.prompt);
          }
        }}
        folders={folders}
        selectedFolder={selectedFolder}
        onFolderCreated={handleFolderCreated}
      />
    </div>
  );
} 