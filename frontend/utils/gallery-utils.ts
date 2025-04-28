import { GalleryItem, MediaType, fetchGalleryImages } from "@/services/api";
import { API_BASE_URL } from "@/services/api";
import { sasTokenService } from "@/services/sas-token";

/**
 * Convert GalleryItem to ImageMetadata
 */
async function mapGalleryItemToImageMetadata(item: GalleryItem, index: number): Promise<ImageMetadata> {
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
  
  // Extract dimensions if available
  let width: number | undefined;
  let height: number | undefined;
  
  // Try to extract dimensions from metadata
  const filename = item.name;
  
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
interface ImageMetadata {
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
    // Set up optional folder path query parameter
    let folderQuery = "";
    if (folderPath) {
      folderQuery = `&prefix=${encodeURIComponent(folderPath)}`;
    }
    
    // Try to fetch images from the API
    const response = await fetchGalleryImages(limit, offset, undefined, folderPath);
    
    if (response.success && response.items.length > 0) {
      // Sort images by creation time (newest first)
      const sortedItems = [...response.items]
        .filter(item => item.media_type === MediaType.IMAGE)
        .sort((a, b) => {
          // Parse dates and compare them (newest first)
          const dateA = new Date(a.creation_time).getTime();
          const dateB = new Date(b.creation_time).getTime();
          return dateB - dateA;
        });
      
      // Map items to metadata with Promise.all to handle async mapping
      const imageItemPromises = sortedItems
        .map((item, index) => mapGalleryItemToImageMetadata(item, index));
      
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