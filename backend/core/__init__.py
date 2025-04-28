import logging
from openai import AzureOpenAI, OpenAI
from .config import settings
from .gpt_image import GPTImageClient
import json
from datetime import datetime, timedelta, timezone
from azure.storage.blob import generate_container_sas, ContainerSasPermissions

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize GPT-Image-1 client
try:
    # Using OpenAI API directly for GPT-Image-1
    dalle_client = GPTImageClient(
        api_key=settings.OPENAI_API_KEY,
        organization_id=settings.OPENAI_ORG_ID if settings.OPENAI_ORG_ID else None
    )
    logger.info("Initialized GPT-Image-1 client using OpenAI API.")
except Exception as e:
    logger.error(f"Failed to initialize GPT-Image-1 client: {str(e)}")
    dalle_client = None

# Initialize LLM client
try:
    llm_client = AzureOpenAI(
        azure_endpoint=f"https://{settings.LLM_AOAI_RESOURCE}.openai.azure.com/",
        api_key=settings.LLM_AOAI_API_KEY,
        api_version="2025-01-01-preview"
    )
    logger.info(
        f"Initialized LLM client with resource: {settings.LLM_AOAI_RESOURCE}")
except Exception as e:
    logger.error(f"Failed to initialize LLM client: {str(e)}")
    llm_client = None

# Generate a blob SAS tokens for the image container, valid for 4 hours
# TODO: Potentially add as a method to the AzureBlobStorage class

try:
    image_sas_token = generate_container_sas(
        account_name=settings.AZURE_STORAGE_ACCOUNT_NAME,
        container_name=settings.AZURE_BLOB_IMAGE_CONTAINER,
        account_key=settings.AZURE_STORAGE_ACCOUNT_KEY,
        permission=ContainerSasPermissions(read=True, list=True),
        expiry=datetime.now(timezone.utc) + timedelta(hours=4),
    )
    logger.info("Generated SAS token for image container.")
except Exception as e:
    logger.error(f"Failed to generate SAS token for image container: {str(e)}")
