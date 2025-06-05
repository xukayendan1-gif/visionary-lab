import { fetchGalleryVideos, GalleryItem, MediaType, fetchGalleryImages } from "@/services/api";
import { API_BASE_URL } from "@/services/api";
import { sasTokenService } from "@/services/sas-token";

export interface VideoMetadata {
  src: string;
  title: string;
  description?: string;
  size: "small" | "medium" | "large";
  id: string;
  name: string;
  tags?: string[];
  originalItem: GalleryItem;
  width?: number;
  height?: number;
  // Analysis metadata from Azure Blob Storage
  analysis?: {
    summary?: string;
    products?: string;
    tags?: string[];
    feedback?: string;
    analyzed?: boolean;
  };
}

/**
 * Convert GalleryItem to VideoMetadata
 */
async function mapGalleryItemToVideoMetadata(item: GalleryItem): Promise<VideoMetadata> {
  // Extract title from metadata or name
  const title = item.metadata?.title || item.name.split('.')[0].replace(/_/g, ' ');
  
  // Extract prompt from metadata - prioritize prompt over description
  const description = item.metadata?.prompt || item.metadata?.description || '';
  
  let src: string;
  
  try {
    // Try to get a direct URL with SAS token
    src = await sasTokenService.getBlobUrl(item.name, item.media_type === MediaType.VIDEO);
    console.log(`Using direct blob URL for ${item.name}`);
  } catch (error) {
    console.warn("Failed to get SAS token URL, falling back to proxy:", error);
    // Fallback to proxy URL
    src = `${API_BASE_URL}/gallery/asset/${item.media_type}/${item.name}`;
  }
  
  // Extract analysis metadata if available
  let analysis: VideoMetadata['analysis'] = undefined;
  if (item.metadata) {
    const hasAnalysis = item.metadata.summary || item.metadata.products || item.metadata.tags || item.metadata.feedback;
    if (hasAnalysis) {
      analysis = {
        summary: item.metadata.summary as string,
        products: item.metadata.products as string,
        feedback: item.metadata.feedback as string,
        analyzed: item.metadata.analyzed === 'true' || item.metadata.analyzed === true,
      };
      
      // Parse tags from metadata - they might be stored as comma-separated string
      if (item.metadata.tags) {
        if (typeof item.metadata.tags === 'string') {
          analysis.tags = item.metadata.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        } else if (Array.isArray(item.metadata.tags)) {
          analysis.tags = item.metadata.tags;
        }
      }
    }
  }

  return {
    id: item.id,
    name: item.name,
    src,
    title: title.charAt(0).toUpperCase() + title.slice(1), // Capitalize first letter
    description: description,
    // We'll assign the size later in a structured way
    size: "medium", // Default size, will be overridden
    originalItem: item,
    analysis,
  };
}

/**
 * Assign sizes to videos in a structured pattern to create a visually interesting grid
 */
function assignVideoSizes(videos: VideoMetadata[]): VideoMetadata[] {
  return videos.map((video, index) => {
    // Create a structured pattern of sizes
    // Every 5th video is large, every 3rd is small, the rest are medium
    let size: "small" | "medium" | "large" = "medium";
    
    if (index % 5 === 0) {
      size = "large";
    } else if (index % 3 === 0) {
      size = "small";
    }
    
    return {
      ...video,
      size
    };
  });
}

/**
 * Fetch videos from the gallery API
 */
export async function fetchVideos(
  limit: number = 50, 
  offset: number = 0,
  folderPath?: string
): Promise<VideoMetadata[]> {
  try {
    // Try to fetch videos from the API
    const response = await fetchGalleryVideos(limit, offset, undefined, undefined, folderPath);
    
    if (response.success && response.items.length > 0) {
      // Map items to metadata with Promise.all to handle async mapping
      const videoItemPromises = response.items
        .filter(item => item.media_type === MediaType.VIDEO)
        .map((item) => mapGalleryItemToVideoMetadata(item));
      
      const videoItems = await Promise.all(videoItemPromises);
      
      // Assign sizes in a structured way
      return assignVideoSizes(videoItems);
    } else {
      console.warn("No videos found in gallery API");
      return []; // Return empty array instead of mock videos
    }
  } catch (error) {
    console.error("Error fetching videos from gallery API:", error);
    return []; // Return empty array instead of mock videos
  }
}

/**
 * Convert GalleryItem to ImageMetadata
 */
async function mapGalleryItemToImageMetadata(item: GalleryItem): Promise<ImageMetadata> {
  // Extract title from metadata or name
  const title = item.metadata?.title || item.name.split('.')[0].replace(/_/g, ' ');
  
  // Extract description from metadata
  const description = item.metadata?.description || '';
  
  let src: string;
  
  // Extract just the filename without folder path
  const filename = item.name.split('/').pop() || item.name;
  
  try {
    // Try to get a direct URL with SAS token for better performance
    src = await sasTokenService.getBlobUrl(item.name, item.media_type === MediaType.VIDEO);
    console.log(`Using direct blob URL for ${item.name}`);
  } catch (error) {
    console.warn("Failed to get SAS token URL for image, falling back to proxy:", error);
  
    // Fallback to proxy URL
    if (item.folder_path) {
      // If we have a folder path, construct the full path with folder
      const folderSegments = item.folder_path.replace(/^\/|\/$/g, '').split('/');
      const segments = [...folderSegments, filename];
      // For catch-all route, use separate segments
      src = `/api/image/${segments.join('/')}`;
    } else {
      // Without folder, use just the filename
      src = `/api/image/${filename}`;
    }
  }
  
  // Extract width and height from metadata if available
  let width: number | undefined;
  let height: number | undefined;
  
  // Try to extract dimensions from multiple potential metadata fields
  if (item.metadata?.width && !isNaN(Number(item.metadata.width))) {
    width = Number(item.metadata.width);
  } else if (item.metadata?.image_width && !isNaN(Number(item.metadata.image_width))) {
    width = Number(item.metadata.image_width);
  } else if (item.metadata?.dimensions?.width && !isNaN(Number(item.metadata.dimensions.width))) {
    width = Number(item.metadata.dimensions.width);
  }
  
  if (item.metadata?.height && !isNaN(Number(item.metadata.height))) {
    height = Number(item.metadata.height);
  } else if (item.metadata?.image_height && !isNaN(Number(item.metadata.image_height))) {
    height = Number(item.metadata.image_height);
  } else if (item.metadata?.dimensions?.height && !isNaN(Number(item.metadata.dimensions.height))) {
    height = Number(item.metadata.dimensions.height);
  }
  
  // Try to parse from the 'size' metadata field (e.g., "1024x1024")
  if (!width && item.metadata?.size && /\d+x\d+/i.test(item.metadata.size)) {
    const parts = item.metadata.size.split('x');
    if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
      width = Number(parts[0]);
    }
  }
  
  if (!height && item.metadata?.size && /\d+x\d+/i.test(item.metadata.size)) {
    const parts = item.metadata.size.split('x');
    if (parts.length === 2 && !isNaN(Number(parts[1]))) {
      height = Number(parts[1]);
    }
  }
  
  // If the filename contains dimensions (pattern like 1920x1080), try to extract them
  const dimensionsMatch = filename.match(/(\d+)x(\d+)/i);
  if (!width && !height && dimensionsMatch && dimensionsMatch.length >= 3) {
    width = parseInt(dimensionsMatch[1], 10);
    height = parseInt(dimensionsMatch[2], 10);
  }
  
  // Extract tags if available
  let tags: string[] = [];
  if (item.metadata?.tags) {
    try {
      if (typeof item.metadata.tags === 'string') {
        tags = JSON.parse(item.metadata.tags);
      } else if (Array.isArray(item.metadata.tags)) {
        tags = item.metadata.tags;
      }
    } catch (e) {
      console.warn('Failed to parse tags metadata', e);
    }
  }
  
  // Log the mapping for debugging
  console.log(`Mapping gallery item to metadata:`, {
    id: item.id,
    name: item.name,
    folderPath: item.folder_path,
    proxyUrl: src
  });
  
  return {
    id: item.id,
    name: item.name,
    src,
    title: title.charAt(0).toUpperCase() + title.slice(1), // Capitalize first letter
    description: description,
    width,
    height,
    tags,
    // We'll assign the size later
    size: "medium", // Default size, will be overridden
    originalItem: item,
  };
}

/**
 * Interface for image metadata
 */
export interface ImageMetadata {
  src: string;
  title: string;
  description?: string;
  id: string;
  name: string;
  tags?: string[];
  originalItem: GalleryItem;
  width?: number;
  height?: number;
  size: "small" | "medium" | "large";
}

/**
 * Assign sizes to images based on dimensions or in a structured pattern
 */
function assignImageSizes(images: ImageMetadata[]): ImageMetadata[] {
  return images.map((image, index) => {
    // If we have width and height, use them to determine size
    if (image.width && image.height) {
      const ratio = image.width / image.height;
      
      if (ratio > 1.5) {
        return { ...image, size: "large" }; // Wide images
      } else if (ratio < 0.7) {
        return { ...image, size: "small" }; // Tall images
      } else {
        return { ...image, size: "medium" }; // Square-ish images
      }
    }
    
    // Fall back to alternating pattern based on index
    let size: "small" | "medium" | "large" = "medium";
    
    if (index % 5 === 0) {
      size = "large";
    } else if (index % 3 === 0) {
      size = "small";
    }
    
    return { ...image, size };
  });
}

/**
 * Fetch images from the gallery API
 */
export async function fetchImages(
  limit: number = 50, 
  offset: number = 0,
  folderPath?: string
): Promise<ImageMetadata[]> {
  try {
    // Try to fetch images from the API
    const response = await fetchGalleryImages(limit, offset, undefined, undefined, folderPath);
    
    if (response.success && response.items.length > 0) {
      // Map items to metadata with Promise.all to handle async mapping
      const imageItemPromises = response.items
        .filter(item => item.media_type === MediaType.IMAGE)
        .map(item => mapGalleryItemToImageMetadata(item));
      
      const imageItems = await Promise.all(imageItemPromises);
      
      // Assign sizes in a structured way
      return assignImageSizes(imageItems);
    } else {
      console.warn("No images found in gallery API");
      // Return empty array instead of mock images
      return [];
    }
  } catch (error) {
    console.error("Error fetching images from gallery API:", error);
    // Return empty array instead of mock images
    return [];
  }
} 