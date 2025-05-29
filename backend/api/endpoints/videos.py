import json
import logging
import os
import re
from typing import List, Optional
from urllib.parse import urlparse

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse

from backend.core import llm_client, sora_client, video_sas_token
from backend.core.analyze import VideoAnalyzer, VideoExtractor
from backend.core.config import settings
from backend.core.instructions import (
    analyze_video_system_message,
    filename_system_message,
    video_prompt_enhancement_system_message,
)
from backend.models.videos import (
    VideoFilenameGenerateRequest,
    VideoFilenameGenerateResponse,
    VideoAnalyzeRequest,
    VideoAnalyzeResponse,
    VideoGenerationJobResponse,
    VideoGenerationRequest,
    VideoPromptEnhancementRequest,
    VideoPromptEnhancementResponse,
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Log video directory setting
logger.info(f"Video directory: {settings.VIDEO_DIR}")

# Check if clients are available
if sora_client is None:
    logger.error(
        "Sora client is not available. API endpoints may not function properly.")
if llm_client is None:
    logger.error(
        "LLM client is not available. API endpoints may not function properly.")


router = APIRouter()

# --- /videos API Endpoints ---


@router.post("/jobs", response_model=VideoGenerationJobResponse)
def create_video_generation_job(req: VideoGenerationRequest):
    try:
        # Ensure Sora client is available
        if sora_client is None:
            raise HTTPException(
                status_code=503,
                detail="Video generation service is currently unavailable. Please check your environment configuration."
            )

        job = sora_client.create_video_generation_job(
            prompt=req.prompt,
            n_seconds=req.n_seconds,
            height=req.height,
            width=req.width,
            n_variants=req.n_variants
        )
        return VideoGenerationJobResponse(**job)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/{job_id}", response_model=VideoGenerationJobResponse)
def get_video_generation_job(job_id: str):
    try:
        # Ensure Sora client is available
        if sora_client is None:
            raise HTTPException(
                status_code=503,
                detail="Video generation service is currently unavailable. Please check your environment configuration."
            )

        job = sora_client.get_video_generation_job(job_id)
        return VideoGenerationJobResponse(**job)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/jobs", response_model=List[VideoGenerationJobResponse])
def list_video_generation_jobs(limit: int = Query(50, ge=1, le=100)):
    try:
        # Ensure Sora client is available
        if sora_client is None:
            raise HTTPException(
                status_code=503,
                detail="Video generation service is currently unavailable. Please check your environment configuration."
            )

        jobs = sora_client.list_video_generation_jobs(limit=limit)
        return [VideoGenerationJobResponse(**job) for job in jobs.get('data', [])]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/jobs/{job_id}")
def delete_video_generation_job(job_id: str):
    try:
        # Ensure Sora client is available
        if sora_client is None:
            raise HTTPException(
                status_code=503,
                detail="Video generation service is currently unavailable. Please check your environment configuration."
            )

        status = sora_client.delete_video_generation_job(job_id)
        return {"deleted": status == 204, "job_id": job_id}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/jobs/failed")
def delete_failed_video_generation_jobs():
    try:
        # Ensure Sora client is available
        if sora_client is None:
            raise HTTPException(
                status_code=503,
                detail="Video generation service is currently unavailable. Please check your environment configuration."
            )

        jobs = sora_client.list_video_generation_jobs(limit=50)
        deleted = []
        for job in jobs.get('data', []):
            if job.get('status') == 'failed':
                try:
                    sora_client.delete_video_generation_job(job['id'])
                    deleted.append(job['id'])
                except Exception:
                    pass
        return {"deleted_failed_jobs": deleted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/generations/{generation_id}/content", status_code=status.HTTP_200_OK)
def download_generation_content(generation_id: str, file_name: str, target_folder: Optional[str] = None, as_gif: bool = False):
    """
    Download video or GIF content for a specific generation.

    Args:
        generation_id: The ID of the generation
        file_name: Name to save the file as
        target_folder: Optional folder to save to (defaults to settings.VIDEO_DIR or 'gifs')
        as_gif: Whether to download as GIF instead of MP4

    Returns:
        FileResponse with the requested content
    """
    try:
        # Ensure Sora client is available
        if sora_client is None:
            raise HTTPException(
                status_code=503,
                detail="Video generation service is currently unavailable. Please check your environment configuration."
            )

        # Use settings from config if target_folder not provided
        if not target_folder:
            target_folder = settings.VIDEO_DIR if not as_gif else "gifs"

        logger.info(
            f"Downloading {'GIF' if as_gif else 'video'} content for generation {generation_id}")

        if as_gif:
            file_path = sora_client.get_video_generation_gif_content(
                generation_id, file_name, target_folder)
        else:
            file_path = sora_client.get_video_generation_video_content(
                generation_id, file_name, target_folder)

        # Verify the file was downloaded successfully
        if not os.path.isfile(file_path):
            raise FileNotFoundError(
                f"Downloaded file not found at {file_path}")

        logger.info(f"Successfully downloaded file. Returning: {file_path}")

        # Use FileResponse to return the file
        return FileResponse(
            path=file_path,
            filename=file_name,
            media_type="image/gif" if as_gif else "video/mp4"
        )

    except Exception as e:
        logger.error(f"Error downloading content: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error downloading content: {str(e)}"
        )


@router.post("/analyze", response_model=VideoAnalyzeResponse)
def analyze_video(req: VideoAnalyzeRequest):
    """
    Analyze a video by extracting frames and generating insights using an LLM.

    Args:
        video_path: Video path on Azure Blob Storage. Supports a full URL with or without a SAS token. Backend will add the SAS token for the video container if not provided.

    Returns:
        Response containing summary, products, tags, and feedback generated by the LLM.
    """
    try:
        file_path = req.video_path

        # check if the path is a valid Azure blob storage path
        pattern = r"^https://[a-z0-9]+\.blob\.core\.windows\.net/[a-z0-9]+/.+"
        match = re.match(pattern, file_path)

        if not match:
            raise ValueError("Invalid Azure blob storage path")
        else:
            # check if the path contains a SAS token
            if "?" not in file_path:
                file_path += f"?{video_sas_token}"

        # extract frames from the video each 2 seconds
        video_extractor = VideoExtractor(file_path)
        frames = video_extractor.extract_video_frames(interval=2) 
        
        video_analyzer = VideoAnalyzer(llm_client, settings.LLM_DEPLOYMENT)
        insights = video_analyzer.video_chat(frames, system_message=analyze_video_system_message)
        summary = insights.get('summary')
        products = insights.get('products')
        tags = insights.get('tags')
        feedback = insights.get('feedback')

        return VideoAnalyzeResponse(summary=summary, products=products, tags=tags, feedback=feedback)
    
    except Exception as e:
        logger.error(f"Error analyzing video: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Error analyzing video. Please try again later."
        )
    

@router.post("/prompt/enhance", response_model=VideoPromptEnhancementResponse)
def enhance_video_prompt(req: VideoPromptEnhancementRequest):
    """
    Improves a given text to video prompt considering best practices for the video generation model.

    Args:
        original_prompt: Original text to video prompt.

    Returns:
        enhanced_prompt: Improved text to video prompt.
    """
    try:
        # Ensure LLM client is available
        if llm_client is None:
            raise HTTPException(
                status_code=503,
                detail="LLM service is currently unavailable. Please check your environment configuration."
            )

        original_prompt = req.original_prompt
        # Call the LLM to enhance the prompt
        messages = [
            {"role": "system", "content": video_prompt_enhancement_system_message},
            {"role": "user", "content": original_prompt},
        ]
        response = llm_client.chat.completions.create(messages=messages,
                                                             model=settings.LLM_DEPLOYMENT,
                                                             response_format={"type": "json_object"})
        enhanced_prompt = json.loads(response.choices[0].message.content).get('prompt')
        return VideoPromptEnhancementResponse(enhanced_prompt=enhanced_prompt)
    
    except Exception as e:
        logger.error(f"Error enhancing video prompt: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/filename/generate", response_model=VideoFilenameGenerateResponse)
def generate_video_filename(req: VideoFilenameGenerateRequest):
    """
    Creates a concise prefix for a file based on the text prompt used for creating the image or video.

    Args:
        prompt: Text prompt.
        gen_id: Optional generation ID to append for uniqueness.
        extension: Optional file extension to append (e.g., ".mp4").

    Returns:
        filename: Generated filename Example: "xbox_venice_beach_sunset_2023_12345.mp4"
    """

    try:
        # Ensure LLM client is available
        if llm_client is None:
            raise HTTPException(
                status_code=503,
                detail="LLM service is currently unavailable. Please check your environment configuration."
            )

        # Validate prompt
        if not req.prompt or not req.prompt.strip():
            raise HTTPException(
                status_code=400,
                detail="Prompt must not be empty."
            )

        # Call the LLM to enhance the prompt
        messages = [
            {"role": "system", "content": filename_system_message},
            {"role": "user", "content": req.prompt},
        ]
        response = llm_client.chat.completions.create(
            messages=messages,
            model=settings.LLM_DEPLOYMENT,
            response_format={"type": "json_object"}
        )
        filename = json.loads(response.choices[0].message.content).get('filename_prefix')

        # Validate and sanitize filename
        if not filename or not filename.strip():
            raise HTTPException(
                status_code=500,
                detail="Failed to generate a valid filename prefix."
            )
        # Remove invalid characters for most filesystems
        filename = re.sub(r'[^a-zA-Z0-9_\-]', '_', filename.strip())

        # add generation id for uniqueness and extension if provided
        if req.gen_id:
            filename += f"_{req.gen_id}"
        if req.extension:
            ext = req.extension.lstrip('.')
            filename += f".{ext}"

        return VideoFilenameGenerateResponse(filename=filename)

    except Exception as e:
        logger.error(f"Error generating filename: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

