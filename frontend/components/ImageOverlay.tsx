import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Settings, Wand2, Loader2, ArrowUp, CloudCog, Save, Database, Shield, Zap, Sparkles, Images, FolderTree, Plus, Check, RefreshCw, FolderUp, Layers, FileType, PlusCircle, BarChart4 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utils/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { enhanceImagePrompt, createFolder, MediaType, fetchFolders } from "@/services/api";
import { toast } from "sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSidebar } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";

interface ImageOverlayProps {
  onGenerate: (settings: {
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
  }) => void;
  isGenerating?: boolean;
  onPromptChange?: (newPrompt: string, isEnhanced: boolean) => void;
  folders?: string[];
  selectedFolder?: string;
  onFolderCreated?: (newFolder: string | string[]) => void;
}

export function ImageOverlay({ 
  onGenerate, 
  isGenerating = false, 
  onPromptChange,
  folders = [],
  selectedFolder = "",
  onFolderCreated
}: ImageOverlayProps) {
  const [prompt, setPrompt] = useState("");
  const [imageSize, setImageSize] = useState("1024x1024");
  const [saveImages, setSaveImages] = useState(true);
  const [mode, setMode] = useState("prod");
  const [brandsProtection, setBrandsProtection] = useState("off");
  const [aiAnalysisEnabled, setAiAnalysisEnabled] = useState(true);
  const [variations, setVariations] = useState("1");
  const [expanded, setExpanded] = useState(true);
  const [isWizardEnhancing, setIsWizardEnhancing] = useState(false);
  const [folder, setFolder] = useState(selectedFolder || "root");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolderLoading, setIsCreatingFolderLoading] = useState(false);
  const [isRefreshingFolders, setIsRefreshingFolders] = useState(false);
  const [background, setBackground] = useState("auto");
  const [outputFormat, setOutputFormat] = useState("png");
  const [quality, setQuality] = useState("auto");
  const [sourceImages, setSourceImages] = useState<File[]>([]);
  
  // Reference to the textarea element
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get sidebar state to adjust overlay positioning
  const sidebar = useSidebar();

  // Update folder when selectedFolder prop changes
  useEffect(() => {
    setFolder(selectedFolder || "root");
  }, [selectedFolder]);

  // Focus the new folder input when creating folder
  useEffect(() => {
    if (isCreatingFolder && newFolderInputRef.current) {
      newFolderInputRef.current.focus();
    }
  }, [isCreatingFolder]);

  // Resize textarea when prompt changes (especially after AI enhancement)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      // Only auto-resize if we haven't hit the max height
      const scrollHeight = textareaRef.current.scrollHeight;
      if (scrollHeight <= 200) {
        textareaRef.current.style.height = `${scrollHeight}px`;
      } else {
        textareaRef.current.style.height = '200px';
      }
    }
  }, [prompt]);

  // Effect to handle format compatibility with transparent background
  useEffect(() => {
    if (background === "transparent" && outputFormat === "jpeg") {
      setOutputFormat("png");
    }
  }, [background, outputFormat]);

  const handleSubmit = () => {
    if (!prompt.trim() || isGenerating) return;
    
    onGenerate({
      prompt,
      imageSize,
      saveImages,
      mode,
      brandsProtection,
      brandProtectionModel: aiAnalysisEnabled ? "GPT-4o" : "None",
      variations: parseInt(variations),
      folder: folder === "root" ? "" : folder,
      background,
      outputFormat,
      quality,
      sourceImages: sourceImages.length > 0 ? sourceImages : undefined,
    });
  };

  const handleWizardEnhance = async () => {
    if (!prompt.trim() || isGenerating || isWizardEnhancing) return;
    
    // Set loading state
    setIsWizardEnhancing(true);
    
    try {
      // Call the API to enhance the prompt
      const enhancedPrompt = await enhanceImagePrompt(prompt.trim());
      
      // Update the prompt with the enhanced version
      setPrompt(enhancedPrompt);
      
      // Notify parent component about the prompt change
      if (onPromptChange) {
        onPromptChange(enhancedPrompt, true);
      }
      
      // Show success message
      toast.success("Prompt enhanced", {
        description: "Your prompt has been enhanced with AI"
      });
    } catch (error) {
      console.error("Error enhancing prompt:", error);
      toast.error("Failed to enhance prompt", {
        description: "Please try again or adjust your prompt"
      });
    } finally {
      // Reset loading state
      setIsWizardEnhancing(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      setIsCreatingFolderLoading(true);
      
      // Call the API to create the folder
      const result = await createFolder(newFolderName.trim(), MediaType.IMAGE);
      
      if (result.success) {
        // Show success message
        toast.success("Folder created", {
          description: `Folder "${newFolderName}" has been created successfully`
        });
        
        // Get the new folder path
        const newFolderPath = result.folder_path;
        
        // Reset the form
        setNewFolderName("");
        setIsCreatingFolder(false);
        
        // Select the newly created folder
        setFolder(newFolderPath);
        
        // Notify parent component about the new folder
        if (onFolderCreated) {
          onFolderCreated(newFolderPath);
        }
      }
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.error("Failed to create folder", {
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsCreatingFolderLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateFolder();
    } else if (e.key === 'Escape') {
      setIsCreatingFolder(false);
      setNewFolderName("");
    }
  };

  // Function to refresh the folders list
  const handleRefreshFolders = async () => {
    if (isRefreshingFolders) return;
    
    try {
      setIsRefreshingFolders(true);
      
      const result = await fetchFolders(MediaType.IMAGE);
      
      if (result.folders && onFolderCreated) {
        // Update the parent component with the full folder list
        onFolderCreated(result.folders);
        
        toast.success("Folders refreshed", {
          description: `${result.folders.length} folders available`
        });
      }
    } catch (error) {
      console.error("Error refreshing folders:", error);
      toast.error("Failed to refresh folders", {
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsRefreshingFolders(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: File[] = Array.from(e.target.files);
      const validFiles: File[] = [];
      let errorOccurred = false;
      
      // Validate each file
      for (const file of newFiles) {
        // Check file type
        if (!file.type.match('image/(jpeg|png|webp)')) {
          toast.error("Invalid file type", {
            description: `${file.name}: Please select JPG, PNG, or WebP images only`
          });
          errorOccurred = true;
          continue;
        }
        
        // Check file size (25MB max for gpt-image-1)
        if (file.size > 25 * 1024 * 1024) {
          toast.error("File too large", {
            description: `${file.name}: Images must be less than 25MB`
          });
          errorOccurred = true;
          continue;
        }
        
        validFiles.push(file);
      }
      
      // Limit to 5 images total (gpt-image-1 supports up to 10, but we'll be conservative)
      if (sourceImages.length + validFiles.length > 5) {
        toast.warning("Too many images", {
          description: "Maximum 5 images can be selected"
        });
        
        // Take only what we can fit
        const spaceLeft = 5 - sourceImages.length;
        validFiles.splice(spaceLeft);
      }
      
      if (validFiles.length > 0) {
        setSourceImages(prev => [...prev, ...validFiles]);
        
        toast.success("Images selected", {
          description: `Added ${validFiles.length} image${validFiles.length > 1 ? 's' : ''}`
        });
      }
    }
  };
  
  // Handle image removal - now removes a specific image by index
  const handleRemoveImage = (index: number) => {
    setSourceImages(prev => prev.filter((_, i) => i !== index));
  };
  
  // Handle clearing all images
  const handleClearAllImages = () => {
    setSourceImages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="sticky bottom-0 left-0 right-0 flex items-end justify-center p-6 z-20 pointer-events-none">
      <div className={cn(
        "w-full max-w-4xl transition-all duration-200 ease-in-out pointer-events-auto",
        expanded ? "mb-6" : "mb-2"
      )}>
        <div className="backdrop-blur-sm bg-black/40 rounded-xl p-4 shadow-lg border border-white/10">
          <div className="flex flex-col space-y-4">
            {/* Image thumbnails row */}
            {sourceImages.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                {sourceImages.map((img, index) => (
                  <div key={index} className="relative">
                    <img 
                      src={URL.createObjectURL(img)} 
                      alt={`Image ${index + 1}`} 
                      className="w-12 h-12 object-cover rounded-md border border-gray-500/30"
                    />
                    <button 
                      onClick={() => handleRemoveImage(index)}
                      className="absolute -top-2 -right-2 bg-black/70 rounded-full p-0.5 text-white hover:bg-black"
                      disabled={isGenerating}
                      aria-label="Remove image"
                      title="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {sourceImages.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAllImages}
                    className="text-white/70 hover:text-white hover:bg-white/10 text-xs"
                    disabled={isGenerating}
                  >
                    Clear all
                  </Button>
                )}
              </div>
            )}
            
            {/* Input row with buttons */}
            <div className="flex items-start gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setExpanded(!expanded)}
                aria-label="Toggle options"
                className="text-white/70 hover:text-white hover:bg-white/10 mt-1"
                disabled={isGenerating}
              >
                {expanded ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Settings className="h-5 w-5" />
                )}
              </Button>
              
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.click();
                        }
                      }}
                      aria-label="Upload images"
                      className="text-white/70 hover:text-white hover:bg-white/10 mt-1"
                      disabled={isGenerating}
                    >
                      <PlusCircle className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="font-medium">
                    <p>Upload images to edit (max 5)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={isGenerating}
                aria-label="Upload image files"
                multiple
              />
              
              <div className="flex-1 relative">
                <Textarea
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    if (onPromptChange) {
                      onPromptChange(e.target.value, false);
                    }
                  }}
                  placeholder={sourceImages.length > 0 ? "Describe how to edit these images..." : "Describe your image..."}
                  className="bg-black/30 border border-gray-500/30 focus-visible:ring-1 focus-visible:ring-white/20 text-white placeholder:text-white/50 min-h-[40px] max-h-[200px] resize-none px-3 py-2 overflow-y-auto"
                  disabled={isGenerating}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && prompt.trim() && !isGenerating) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  onInput={(e) => {
                    // Auto-resize textarea
                    const target = e.target as HTMLTextAreaElement;
                    // Only auto-resize if we haven't hit the max height
                    if (target.scrollHeight <= 200) {
                      target.style.height = 'auto';
                      target.style.height = `${target.scrollHeight}px`;
                    }
                  }}
                  rows={1}
                  ref={textareaRef}
                />
              </div>
              
              <div className="flex items-start gap-2 mt-1">
                <TooltipProvider>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleWizardEnhance}
                        aria-label="Enhance prompt"
                        className="bg-white/10 border-0 hover:bg-white/20 text-white min-w-9 h-9"
                        disabled={isGenerating || isWizardEnhancing || !prompt.trim()}
                      >
                        {isWizardEnhancing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Wand2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="font-medium">
                      <p>Enhance your prompt with AI</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <Button
                  variant="outline"
                  onClick={handleSubmit}
                  className="bg-white/10 border-0 hover:bg-white/20 text-white"
                  disabled={isGenerating || !prompt.trim()}
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4 mr-2" />
                  )}
                  {isGenerating ? "Processing..." : sourceImages.length > 0 ? "Edit Images" : "Generate"}
                </Button>
              </div>
            </div>

            {expanded && (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <TooltipProvider>
                  <div className="flex flex-wrap items-center gap-3 transition-all duration-200 ease-in-out opacity-100 translate-y-0">
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          <Select
                            value={imageSize}
                            onValueChange={setImageSize}
                            disabled={isGenerating}
                          >
                            <SelectTrigger className="w-[120px] h-8 bg-black/30 border-0 text-white focus:ring-white/20">
                              <SelectValue placeholder="1024x1024" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="auto">Auto</SelectItem>
                              <SelectItem value="1024x1024">1024x1024</SelectItem>
                              <SelectItem value="1536x1024">1536x1024</SelectItem>
                              <SelectItem value="1024x1536">1024x1536</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="font-medium">
                        <p>Select output image dimensions</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Background Option Dropdown */}
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          <Select
                            value={background}
                            onValueChange={setBackground}
                            disabled={isGenerating}
                          >
                            <SelectTrigger className="w-[140px] h-8 bg-black/30 border-0 text-white focus:ring-white/20">
                              <div className="flex items-center">
                                <Layers className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Background" />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="auto">Auto</SelectItem>
                              <SelectItem value="transparent">Transparent</SelectItem>
                              <SelectItem value="opaque">Opaque</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="font-medium">
                        <p>Choose background transparency type</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Output Format Dropdown */}
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          <Select
                            value={outputFormat}
                            onValueChange={setOutputFormat}
                            disabled={isGenerating}
                          >
                            <SelectTrigger className="w-[100px] h-8 bg-black/30 border-0 text-white focus:ring-white/20">
                              <div className="flex items-center">
                                <FileType className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Format" />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="png">PNG</SelectItem>
                              <SelectItem value="jpeg" disabled={background === "transparent"}>
                                JPEG {background === "transparent" && <span className="text-xs text-muted-foreground ml-1">(requires opaque bg)</span>}
                              </SelectItem>
                              <SelectItem value="webp">WebP</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="font-medium">
                        <p>Select image file format</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Quality Dropdown - New */}
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          <Select
                            value={quality}
                            onValueChange={setQuality}
                            disabled={isGenerating}
                          >
                            <SelectTrigger className="w-[110px] h-8 bg-black/30 border-0 text-white focus:ring-white/20">
                              <div className="flex items-center">
                                <BarChart4 className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Quality" />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="auto">Auto</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="font-medium">
                        <p>Select image quality</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          <Select
                            value={variations}
                            onValueChange={setVariations}
                            disabled={isGenerating}
                          >
                            <SelectTrigger className="w-[80px] h-8 bg-black/30 border-0 text-white focus:ring-white/20">
                              <div className="flex items-center">
                                <Images className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="1" />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                              <SelectItem value="3">3</SelectItem>
                              <SelectItem value="4">4</SelectItem>
                              <SelectItem value="5">5</SelectItem>
                              <SelectItem value="6">6</SelectItem>
                              <SelectItem value="7">7</SelectItem>
                              <SelectItem value="8">8</SelectItem>
                              <SelectItem value="9">9</SelectItem>
                              <SelectItem value="10">10</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="font-medium">
                        <p>Number of image variations to generate</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Folder Select Dropdown */}
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          <Select
                            value={folder}
                            onValueChange={setFolder}
                            disabled={isGenerating}
                            onOpenChange={(open) => {
                              if (!open) {
                                setIsCreatingFolder(false);
                                setNewFolderName("");
                              }
                            }}
                          >
                            <SelectTrigger className="w-[150px] h-8 bg-black/30 border-0 text-white focus:ring-white/20">
                              <div className="flex items-center">
                                <FolderTree className="h-4 w-4 mr-2 text-primary" />
                                <SelectValue placeholder="Root folder" />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              {/* Create Folder UI */}
                              {isCreatingFolder ? (
                                <div className="flex items-center p-1 mb-1 border-b border-muted">
                                  <Input
                                    ref={newFolderInputRef}
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder="New folder name..."
                                    className="h-7 text-xs border-0 focus-visible:ring-0 bg-muted/50"
                                    onKeyDown={handleKeyDown}
                                    disabled={isCreatingFolderLoading}
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={handleCreateFolder}
                                    disabled={!newFolderName.trim() || isCreatingFolderLoading}
                                  >
                                    {isCreatingFolderLoading ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Check className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between p-1 mb-1 border-b border-muted">
                                  <span className="text-xs text-muted-foreground ml-2">Folders</span>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6"
                                      onClick={handleRefreshFolders}
                                      disabled={isRefreshingFolders}
                                    >
                                      <RefreshCw className={`h-3 w-3 ${isRefreshingFolders ? 'animate-spin' : ''}`} />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6"
                                      onClick={() => {
                                        setIsCreatingFolder(true);
                                        // Focus the input after a small delay to allow rendering
                                        setTimeout(() => {
                                          if (newFolderInputRef.current) {
                                            newFolderInputRef.current.focus();
                                          }
                                        }, 10);
                                      }}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                              
                              <SelectItem value="root">Root folder</SelectItem>
                              {folders.map((folderPath) => (
                                <SelectItem key={folderPath} value={folderPath}>
                                  {folderPath}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="font-medium">
                        <p>Storage location for generated image files</p>
                      </TooltipContent>
                    </Tooltip>

                    <ToggleGroup 
                      type="multiple" 
                      size="lg"
                      className="flex space-x-1"
                      value={[
                        ...(saveImages ? ["saveImages"] : []), 
                        ...(aiAnalysisEnabled ? ["aiAnalysis"] : [])
                      ]}
                      onValueChange={(value) => {
                        setSaveImages(value.includes("saveImages"));
                        setAiAnalysisEnabled(value.includes("aiAnalysis"));
                      }}
                      disabled={isGenerating}
                    >
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <ToggleGroupItem 
                            value="saveImages" 
                            aria-label="Toggle saving images"
                            style={{
                              backgroundColor: saveImages ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.3)",
                              border: saveImages ? "1px solid rgba(255, 255, 255, 0.4)" : "1px solid rgba(255, 255, 255, 0.1)",
                              color: saveImages ? "white" : "rgba(255, 255, 255, 0.6)",
                              borderRadius: "0.375rem",
                              padding: "0.25rem",
                              width: "2.5rem",
                              height: "2.5rem",
                            }}
                          >
                            <Save className="h-4 w-4" />
                          </ToggleGroupItem>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="font-medium">
                          <p>Save generated images to storage</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <ToggleGroupItem 
                            value="aiAnalysis" 
                            aria-label="Toggle AI Analysis"
                            style={{
                              backgroundColor: aiAnalysisEnabled ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.3)",
                              border: aiAnalysisEnabled ? "1px solid rgba(255, 255, 255, 0.4)" : "1px solid rgba(255, 255, 255, 0.1)",
                              color: aiAnalysisEnabled ? "white" : "rgba(255, 255, 255, 0.6)",
                              borderRadius: "0.375rem",
                              padding: "0.25rem",
                              width: "2.5rem",
                              height: "2.5rem",
                            }}
                          >
                            <CloudCog className="h-4 w-4" />
                          </ToggleGroupItem>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="font-medium">
                          <p>Enable AI analysis of generated images</p>
                        </TooltipContent>
                      </Tooltip>
                    </ToggleGroup>
                  </div>
                </TooltipProvider>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 