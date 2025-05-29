# Import models to expose them at the package level
from backend.models import common, images, videos, gallery

# Video models actually used by the API
from backend.models.videos import (
    VideoGenerationRequest,
    VideoGenerationJobResponse,
    VideoAnalyzeRequest,
    VideoAnalyzeResponse,
    VideoFilenameGenerateRequest,
    VideoFilenameGenerateResponse
)

# Image models used by the skeleton API
from backend.models.images import (
    ImageGenerationRequest,
    ImageEditRequest,
    ImageGenerationResponse,
    ImageListRequest,
    ImageListResponse,
    ImageDeleteRequest,
    ImageDeleteResponse,
    ImageAnalyzeRequest,
    ImageAnalyzeResponse,
    ImagePromptEnhancementRequest,
    ImagePromptEnhancementResponse,
    ImageFilenameGenerateRequest,
    ImageFilenameGenerateResponse,
)

# Gallery models
from backend.models.gallery import (
    GalleryItem,
    GalleryResponse,
    MediaType,
    AssetUploadResponse,
    AssetDeleteResponse,
    AssetUrlResponse,
    AssetMetadataResponse,
    MetadataUpdateRequest
)

# Re-export other models as needed
