"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface OriginalItem {
  size?: number;
  [key: string]: unknown;
}

interface ImageMetadata {
  src: string;
  title: string;
  description?: string;
  id: string;
  name: string;
  tags?: string[];
  originalItem: OriginalItem;
  width?: number;
  height?: number;
  size: "small" | "medium" | "large";
}

interface ImageAnalyzerProps {
  image: ImageMetadata;
}

// Define a type for the augmented function
type HandleImageLoadFunction = ((e: React.SyntheticEvent<HTMLImageElement>) => void) & { forwardRef?: boolean };

export function ImageAnalyzer({ image }: ImageAnalyzerProps) {
  const [imageStats, setImageStats] = useState<{
    naturalWidth: number;
    naturalHeight: number;
    fileSize?: string;
    aspectRatio: number;
  } | null>(null);
  
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  const handleImageLoad: HandleImageLoadFunction = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setImageStats({
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        fileSize: formatFileSize(image.originalItem?.size),
        aspectRatio: img.naturalWidth / img.naturalHeight
      });
    }
  };
  
  // Expose the handleImageLoad method to parent components
  handleImageLoad.forwardRef = true;
  
  return (
    <div className="space-y-2 text-sm">
      <div className="font-medium">Image Details</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {imageStats ? (
          <>
            <div className="text-muted-foreground">Dimensions:</div>
            <div>{imageStats.naturalWidth} × {imageStats.naturalHeight}px</div>
            
            <div className="text-muted-foreground">Aspect Ratio:</div>
            <div>{imageStats.aspectRatio.toFixed(2)}</div>
            
            <div className="text-muted-foreground">File Size:</div>
            <div>{imageStats.fileSize}</div>
            
            <div className="text-muted-foreground">Format:</div>
            <div>{image.name.split('.').pop()?.toUpperCase() || 'Unknown'}</div>
          </>
        ) : (
          <div className="col-span-2 text-center py-2">
            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            <span className="text-xs text-muted-foreground mt-1">Analyzing image...</span>
          </div>
        )}
      </div>
    </div>
  );
} 