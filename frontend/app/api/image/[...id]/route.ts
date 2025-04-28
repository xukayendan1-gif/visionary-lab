import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL } from '@/services/api';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string[] }> }
) {
  // Await the params object before accessing its properties
  const { id } = await context.params;
  
  try {
    // Join all path segments to reconstruct the full path
    const fullPath = id.join('/');
    
    // Construct the URL to the blob storage asset, ensuring proper encoding
    // We encode individual path segments to maintain the path structure
    const encodedPath = fullPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
    const imageUrl = `${API_BASE_URL}/gallery/asset/image/${encodedPath}`;
    
    console.log(`Fetching image from backend: ${imageUrl}`);
    
    // Fetch the image from the blob storage
    const response = await fetch(imageUrl);
    
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
    
    // Return the image data with appropriate headers
    return new NextResponse(imageData, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('Error proxying image:', error);
    return NextResponse.json(
      { error: 'Failed to proxy image', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 