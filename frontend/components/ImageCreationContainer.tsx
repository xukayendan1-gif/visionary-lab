"use client";

import { useState, useEffect } from "react";
import { ImageOverlay } from "./ImageOverlay";
import { toast } from "sonner";
import { cn } from "@/utils/utils";
import { generateImages, saveGeneratedImages, analyzeImage, analyzeImageFromBase64, updateAssetMetadata, MediaType, fetchFolders, editImage } from "@/services/api";

interface ImageCreationContainerProps {
  className?: string;
  onImagesSaved?: (count?: number) => void;
}

export function ImageCreationContainer({ className = "", onImagesSaved }: ImageCreationContainerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [originalPrompt, setOriginalPrompt] = useState<string | null>(null);
  const [generationResponse, setGenerationResponse] = useState<any>(null);
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("root");
  const [settings, setSettings] = useState({
    prompt: "",
    imageSize: "1024x1024",
    saveImages: true,
    mode: "prod",
    brandsProtection: "off",
    brandProtectionModel: "GPT-4o",
    variations: 1,
    folder: "root",
    background: "auto",
    outputFormat: "png",
    quality: "auto",
    sourceImages: [] as File[],
  });

  // Fetch available folders when component mounts
  useEffect(() => {
    const loadFolders = async () => {
      try {
        const result = await fetchFolders(MediaType.IMAGE);
        setFolders(result.folders);
      } catch (error) {
        console.error("Error loading folders:", error);
      }
    };
    
    loadFolders();
  }, []);

  const handleGenerate = async (newSettings: {
    prompt: string;
    imageSize: string;
    saveImages: boolean;
    mode: string;
    brandsProtection: string;
    brandProtectionModel: string;
    variations: number;
    folder: string;
    background: string;
    outputFormat: string;
    quality: string;
    sourceImages?: File[];
  }) => {
    try {
      setIsGenerating(true);
      setSettings({ ...newSettings, sourceImages: newSettings.sourceImages || [] });
      setSelectedFolder(newSettings.folder);
      
      let successfulAnalysis: any[] | undefined = undefined; // Declare outside the if block
      let response;
      
      // If source images are provided, use the edit endpoint
      if (newSettings.sourceImages && newSettings.sourceImages.length > 0) {
        // Show toast for image editing
        toast.info("Image editing started", {
          description: `Editing ${newSettings.sourceImages.length} image${newSettings.sourceImages.length > 1 ? 's' : ''} with prompt: "${newSettings.prompt.substring(0, 50)}${newSettings.prompt.length > 50 ? '...' : ''}"`,
        });
        
        // Call the image edit API
        response = await editImage(
          newSettings.sourceImages,
          newSettings.prompt,
          newSettings.variations, // Number of variations from dropdown
          newSettings.imageSize, // Use selected size
          newSettings.quality // Quality parameter
        );
        
        toast.success("Image editing completed", {
          description: "Processing edited images..."
        });
      } else {
        // Show toast for image generation
        toast.info("Image generation started", {
          description: `Generating image with prompt: "${newSettings.prompt.substring(0, 50)}${newSettings.prompt.length > 50 ? '...' : ''}"`,
        });
        
        // Call the image generation API
        response = await generateImages(
          newSettings.prompt,
          newSettings.variations, // Number of variations from dropdown
          newSettings.imageSize, // Use selected size
          "b64_json", // Fixed response format for now
          newSettings.background, // Background option
          newSettings.outputFormat, // Output format
          newSettings.quality // Quality parameter
        );
        
        toast.success("Image generation completed", {
          description: "Processing generated images..."
        });
      }
      
      setGenerationResponse(response);
      
      // If AI analysis is enabled, we can analyze before saving
      if (newSettings.saveImages && newSettings.brandProtectionModel === "GPT-4o") {
        // Check if we have base64 image data available (from generation)
        const hasBase64Images = response?.imgen_model_response?.data?.some(
          (item: any) => item.b64_json
        );
        
        if (hasBase64Images) {
          toast.info("AI analysis started", {
            description: "Analyzing generated images before saving..."
          });
          
          // Process each image and collect analysis results
          const analysisPromises = response.imgen_model_response.data.map(
            async (imageData: any, idx: number) => {
              if (imageData.b64_json) {
                try {
                  const result = await analyzeImageFromBase64(imageData.b64_json);
                  return {
                    index: idx,
                    analysis: result
                  };
                } catch (error) {
                  console.error(`Failed to analyze image ${idx+1}:`, error);
                  return {
                    index: idx,
                    error: error instanceof Error ? error.message : String(error)
                  };
                }
              }
              return null;
            }
          );
          
          const analysisResults = await Promise.all(analysisPromises);
          const successCount = analysisResults.filter(r => r && r.analysis).length;
          successfulAnalysis = analysisResults.filter(r => r && r.analysis); // Assign here
          
          if (successCount > 0) {
            toast.success(`AI analysis completed`, {
              description: `Successfully analyzed ${successCount} of ${response.imgen_model_response.data.length} images`
            });
            
            // Store analysis results to use when saving
            setGenerationResponse((prev: any) => ({
              ...prev,
              analysisResults: successfulAnalysis
            }));
          }
        }
      }
      
      // If saveImages is true, proceed to upload
      if (newSettings.saveImages) {
        await handleSaveImages(
          response, 
          newSettings.prompt, 
          newSettings.brandProtectionModel === "GPT-4o", // Simplified shouldAnalyze flag
          newSettings.folder === "root" ? "" : newSettings.folder,
          newSettings.outputFormat,
          newSettings.background,
          newSettings.imageSize,
          successfulAnalysis // Pass pre-analysis results directly
        );
      }
      
    } catch (error) {
      console.error('Error in image operation:', error);
      const hasSourceImages = newSettings.sourceImages && newSettings.sourceImages.length > 0;
      toast.error(hasSourceImages ? "Image editing failed" : "Image generation failed", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleSaveImages = async (
    generationResponse: any, 
    prompt: string, 
    shouldAnalyze: boolean = false, 
    folder: string = "",
    outputFormat: string = "png",
    background: string = "auto",
    imageSize: string,
    preAnalysisResults?: any[] // Add new parameter for pre-analysis results
  ) => {
    try {
      setIsUploading(true);
      
      // Show toast for upload process
      toast.info("Uploading images", {
        description: `Saving generated images${folder ? ' to ' + folder : ' to root folder'}...`
      });
      
      // Call the save images API
      const saveResponse = await saveGeneratedImages(
        generationResponse,
        prompt,
        true, // Save all generated images
        folder, // Folder path
        outputFormat, // Output format
        "gpt-image-1", // Model - This is always gpt-image-1 in our current implementation
        background, // Background setting
        imageSize // Pass imageSize here
      );
      
      // Show success message with details
      toast.success(`${saveResponse.total_saved} images saved`, {
        description: folder 
          ? `Images have been saved to folder: ${folder}` 
          : "Images have been saved to root folder"
      });
      
      // If we have pre-computed analysis results passed directly, apply them
      if (preAnalysisResults && preAnalysisResults.length > 0 && 
          saveResponse.saved_images && saveResponse.saved_images.length > 0) {
        
        setIsAnalyzing(true);
        toast.info("Applying AI analysis", {
          description: "Updating metadata with pre-computed analysis..."
        });
        
        let successCount = 0;
        let failureCount = 0;
        
        // For each saved image, find its corresponding analysis result and apply
        for (let i = 0; i < saveResponse.saved_images.length; i++) {
          const savedImage = saveResponse.saved_images[i];
          // Find corresponding analysis result based on index
          const analysisResult = preAnalysisResults.find(
            (r: any) => r.index === i
          );
          
          if (analysisResult && analysisResult.analysis) {
            try {
              // Prepare metadata with analysis results
              const enhancedMetadata = {
                ...savedImage.metadata,
                description: analysisResult.analysis.description,
                products: analysisResult.analysis.products,
                tags: JSON.stringify(analysisResult.analysis.tags),
                feedback: analysisResult.analysis.feedback
              };
              
              // Update the blob metadata
              await updateAssetMetadata(savedImage.blob_name, MediaType.IMAGE, enhancedMetadata);
              successCount++;
            } catch (error) {
              console.error(`Failed to update metadata for image ${savedImage.blob_name}:`, error);
              failureCount++;
            }
          }
        }
        
        if (successCount > 0) {
          toast.success(`AI analysis applied`, {
            description: `Successfully updated metadata for ${successCount} of ${saveResponse.saved_images.length} images`
          });
        }
        
        setIsAnalyzing(false);
      }
      // Only run post-save analysis if pre-analysis was not done AND shouldAnalyze is true
      else if (!preAnalysisResults && shouldAnalyze && saveResponse.saved_images && saveResponse.saved_images.length > 0) {
        setIsAnalyzing(true);
        
        toast.info("AI analysis started", {
          description: "Analyzing generated images..."
        });
        
        let successCount = 0;
        let failureCount = 0;
        
        // Process each saved image
        for (const image of saveResponse.saved_images) {
          try {
            // Analyze the image
            const analysisResult = await analyzeImage(image.url);
            
            // Prepare metadata with analysis results
            const enhancedMetadata = {
              ...image.metadata,
              description: analysisResult.description,
              products: analysisResult.products,
              tags: JSON.stringify(analysisResult.tags),
              feedback: analysisResult.feedback
            };
            
            // Update the blob metadata
            await updateAssetMetadata(image.blob_name, MediaType.IMAGE, enhancedMetadata);
            
            successCount++;
          } catch (error) {
            console.error(`Failed to analyze or update metadata for image ${image.blob_name}:`, error);
            failureCount++;
          }
        }
        
        // Show summary toast
        if (successCount > 0) {
          toast.success(`AI analysis completed`, {
            description: `Successfully analyzed ${successCount} of ${saveResponse.saved_images.length} images`
          });
        }
        
        if (failureCount > 0) {
          toast.error(`Some analyses failed`, {
            description: `Failed to analyze ${failureCount} of ${saveResponse.saved_images.length} images`
          });
        }
        
        setIsAnalyzing(false);
      }
      
      // Call the callback to refresh the gallery
      if (onImagesSaved) {
        onImagesSaved(saveResponse.total_saved);
      }
      
    } catch (error) {
      console.error('Error saving images:', error);
      toast.error("Failed to save images", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  const handlePromptChange = (newPrompt: string, isEnhanced: boolean) => {
    // Store the original prompt if this is an enhanced version
    if (isEnhanced && !originalPrompt) {
      setOriginalPrompt(settings.prompt);
    }
    
    setSettings(prev => ({
      ...prev,
      prompt: newPrompt
    }));
  };

  // Handle folder creation or updates from the ImageOverlay component
  const handleFolderCreated = (newFolder: string | string[]) => {
    // Update folders list with deduplication
    setFolders(prevFolders => {
      // Handle both single folder and array of folders
      const foldersToAdd = Array.isArray(newFolder) ? newFolder : [newFolder];
      
      // Create a new set with all folders (automatically deduplicates)
      const uniqueFolders = new Set([...prevFolders, ...foldersToAdd]);
      
      // Convert back to array and sort alphabetically
      return Array.from(uniqueFolders).sort((a, b) => a.localeCompare(b));
    });
    
    // Update selected folder (only if a single folder was added)
    if (!Array.isArray(newFolder)) {
      setSelectedFolder(newFolder);
    }
  };

  return (
    <div className={cn("relative w-full h-full", className)}>
      {/* The ImageOverlay component will be positioned absolutely */}
      <ImageOverlay 
        onGenerate={handleGenerate} 
        isGenerating={isGenerating || isUploading || isAnalyzing}
        onPromptChange={handlePromptChange}
        folders={folders}
        selectedFolder={selectedFolder}
        onFolderCreated={handleFolderCreated}
      />
    </div>
  );
} 