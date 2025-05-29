from fastapi import APIRouter
from backend.core.config import settings
from typing import Dict, List

router = APIRouter()


@router.get("/env/status", response_model=Dict[str, List[str]])
def env_status():
    """
    Returns which environment variables are set and which are missing based on the Settings class.
    """
    # Required variables (must be set for the application to work properly)
    required_vars = [
        'SORA_AOAI_RESOURCE',
        'SORA_AOAI_API_KEY',
        'SORA_DEPLOYMENT',
        'LLM_AOAI_RESOURCE',
        'LLM_DEPLOYMENT',
        'LLM_AOAI_API_KEY',
        'IMAGEGEN_AOAI_RESOURCE',
        'IMAGEGEN_DEPLOYMENT',
        'IMAGEGEN_AOAI_API_KEY',
        'AZURE_BLOB_SERVICE_URL',
        'AZURE_STORAGE_ACCOUNT_NAME',
        'AZURE_STORAGE_ACCOUNT_KEY',
        'AZURE_BLOB_IMAGE_CONTAINER',
        'AZURE_BLOB_VIDEO_CONTAINER',
    ]

    # Optional variables (app can function without them)
    optional_vars = [
    ]

    set_vars = []
    missing_vars = []

    # Check required vars using the settings object
    for var in required_vars:
        if hasattr(settings, var) and getattr(settings, var) is not None and getattr(settings, var) != "":
            set_vars.append(var)
        else:
            missing_vars.append(var)

    # Check optional vars using the settings object
    for var in optional_vars:
        if hasattr(settings, var) and getattr(settings, var) is not None and getattr(settings, var) != "":
            set_vars.append(var)

    return {
        "set": set_vars,
        "missing": missing_vars,
        "optional_missing": [var for var in optional_vars if var not in set_vars]
    }
