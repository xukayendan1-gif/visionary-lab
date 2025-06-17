import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL } from '@/services/api';

// Cache for storing image responses
const imageCache = new Map<string, { data: ArrayBuffer; contentType: string; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string[] }> }
) {
  // Await the params object before accessing its properties
  const { id } = await context.params;
  
  try {
    // Join all path segments to reconstruct the full path
    const fullPath = id.join('/');
    const cacheKey = fullPath;
    
    // Check cache first
    const cached = imageCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log(`Serving cached image: ${fullPath}`);
      return new NextResponse(cached.data, {
        headers: {
          'Content-Type': cached.contentType,
          'Cache-Control': 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400',
          'X-Cache': 'HIT',
        },
      });
    }
    
    // Construct the URL to the blob storage asset, ensuring proper encoding
    // We encode individual path segments to maintain the path structure
    const encodedPath = fullPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
    const imageUrl = `${API_BASE_URL}/gallery/asset/image/${encodedPath}`;
    
    console.log(`Fetching image from backend: ${imageUrl}`);
    
    // Fetch the image from the blob storage with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: 'Failed to fetch image', details: `Status: ${response.status}` },
        { status: response.status }
      );
    }
    
    // Get the image data as an ArrayBuffer
    const imageData = await response.arrayBuffer();
    
    // Get the content type from the original response
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Cache the response
    imageCache.set(cacheKey, {
      data: imageData,
      contentType,
      timestamp: Date.now(),
    });
    
    // Clean up old cache entries periodically
    if (imageCache.size > 100) { // Limit cache size
      const now = Date.now();
      for (const [key, value] of imageCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          imageCache.delete(key);
        }
      }
    }
    
    // Return the image data with appropriate headers
    return new NextResponse(imageData, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400',
        'X-Cache': 'MISS',
        'Content-Length': imageData.byteLength.toString(),
        'Vary': 'Accept, Accept-Encoding',
      },
    });
  } catch (error) {
    console.error('Error proxying image:', error);
    
    // Handle timeout errors specifically
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout', details: 'Image fetch timed out after 30 seconds' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to proxy image', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 