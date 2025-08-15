from fastapi import APIRouter, HTTPException, Depends, Body, BackgroundTasks
from typing import Dict, List, Optional, Any
import asyncio

from backend.core.azure_storage import AzureBlobStorageService
from backend.core.config import settings
from backend.models.gallery import (
    MediaType,
    AssetDeleteResponse,
    BatchDeleteRequest,
    BatchDeleteResponse,
    BatchMoveRequest,
    BatchMoveResponse
)

router = APIRouter()


@router.post("/delete", response_model=BatchDeleteResponse)
async def delete_multiple_assets(
    request: BatchDeleteRequest,
    background_tasks: BackgroundTasks,
    azure_storage_service: AzureBlobStorageService = Depends(
        lambda: AzureBlobStorageService())
):
    """
    Delete multiple assets from Azure Blob Storage

    This endpoint deletes multiple assets in a single request.
    For large batches, it uses background tasks to prevent timeouts.
    """
    try:
        # Validate request
        if not request.blob_names:
            raise HTTPException(
                status_code=400, detail="No blob names provided")

        # Determine container name
        container_name = request.container
        if not container_name:
            if not request.media_type:
                raise HTTPException(
                    status_code=400,
                    detail="Either media_type or container must be specified"
                )
            container_name = settings.AZURE_BLOB_IMAGE_CONTAINER if request.media_type == MediaType.IMAGE else settings.AZURE_BLOB_VIDEO_CONTAINER

        # Track results
        results = {}
        
        # Use background task for large batches
        use_background = len(request.blob_names) > 10
        
        if use_background:
            # Process deletions in background
            background_tasks.add_task(
                _delete_assets_background,
                request.blob_names,
                container_name,
                azure_storage_service
            )
            
            return BatchDeleteResponse(
                success=True,
                message=f"Deletion of {len(request.blob_names)} assets started in background",
                total=len(request.blob_names),
                results={},
                background_task=True
            )
        else:
            # Process deletions synchronously
            for blob_name in request.blob_names:
                success = azure_storage_service.delete_asset(blob_name, container_name)
                results[blob_name] = success
                
            # Count successes and failures
            success_count = sum(1 for success in results.values() if success)
            failure_count = len(request.blob_names) - success_count
            
            return BatchDeleteResponse(
                success=failure_count == 0,
                message=f"Deleted {success_count} assets successfully" + (f", {failure_count} failed" if failure_count > 0 else ""),
                total=len(request.blob_names),
                results=results,
                background_task=False
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def _delete_assets_background(
    blob_names: List[str],
    container_name: str,
    azure_storage_service: AzureBlobStorageService
):
    """Background task to delete multiple assets"""
    try:
        results = {}
        for blob_name in blob_names:
            try:
                success = azure_storage_service.delete_asset(blob_name, container_name)
                results[blob_name] = success
            except Exception as e:
                print(f"Error deleting asset {blob_name}: {str(e)}")
                results[blob_name] = False
                
        # Count successes and failures
        success_count = sum(1 for success in results.values() if success)
        failure_count = len(blob_names) - success_count
        
        print(f"Background batch deletion complete: {success_count} succeeded, {failure_count} failed")
    except Exception as e:
        print(f"Error in background batch deletion: {str(e)}")


@router.post("/move", response_model=BatchMoveResponse)
async def move_multiple_assets(
    request: BatchMoveRequest,
    background_tasks: BackgroundTasks,
    azure_storage_service: AzureBlobStorageService = Depends(
        lambda: AzureBlobStorageService())
):
    """
    Move multiple assets to a different folder

    This endpoint moves multiple assets to a target folder in a single request.
    For large batches, it uses background tasks to prevent timeouts.
    """
    try:
        # Validate request
        if not request.blob_names:
            raise HTTPException(
                status_code=400, detail="No blob names provided")
            
        # Normalize target folder
        normalized_folder = azure_storage_service.normalize_folder_path(
            request.target_folder)

        # Determine container name
        container_name = request.container
        if not container_name:
            if not request.media_type:
                raise HTTPException(
                    status_code=400,
                    detail="Either media_type or container must be specified"
                )
            container_name = settings.AZURE_BLOB_IMAGE_CONTAINER if request.media_type == MediaType.IMAGE else settings.AZURE_BLOB_VIDEO_CONTAINER

        # Check if target folder exists
        container_client = azure_storage_service.blob_service_client.get_container_client(
            container_name)
        folders = azure_storage_service.list_folders(container_name)
        if normalized_folder not in folders and normalized_folder != "":
            # Create marker for folder
            folder_marker = f"{normalized_folder}.folder"
            marker_metadata = {
                "is_folder_marker": "true",
                "folder_path": normalized_folder
            }
            folder_blob_client = container_client.get_blob_client(
                folder_marker)
            folder_blob_client.upload_blob(
                data=b"", overwrite=True, metadata=marker_metadata)
                
        # Track results
        results = {}
        
        # Use background task for large batches or if there are large files
        use_background = len(request.blob_names) > 5
        
        if use_background:
            # Process moves in background
            background_tasks.add_task(
                _move_assets_background,
                request.blob_names,
                container_name,
                normalized_folder,
                azure_storage_service
            )
            
            return BatchMoveResponse(
                success=True,
                message=f"Moving {len(request.blob_names)} assets to {normalized_folder or 'root'} started in background",
                total=len(request.blob_names),
                results={},
                target_folder=normalized_folder,
                background_task=True
            )
        else:
            # Process moves synchronously
            for blob_name in request.blob_names:
                try:
                    # Get original blob content and metadata
                    content, content_type = azure_storage_service.get_asset_content(
                        blob_name, container_name)
                    if not content:
                        results[blob_name] = False
                        continue

                    # Get metadata
                    metadata = azure_storage_service.get_asset_metadata(
                        blob_name, container_name) or {}

                    # Create new blob name with target folder
                    file_name = blob_name.split('/')[-1] if '/' in blob_name else blob_name
                    new_blob_name = f"{normalized_folder}{file_name}"

                    # Create blob client for new location
                    blob_client = container_client.get_blob_client(new_blob_name)

                    # Update metadata with new folder path
                    metadata['folder_path'] = normalized_folder

                    # Set content type
                    from azure.storage.blob import ContentSettings
                    content_settings = ContentSettings(content_type=content_type)

                    # Upload to new location
                    blob_client.upload_blob(data=content, overwrite=True,
                                            metadata=metadata, content_settings=content_settings)

                    # Delete original blob after successful copy
                    azure_storage_service.delete_asset(blob_name, container_name)
                    
                    results[blob_name] = True
                except Exception as e:
                    print(f"Error moving asset {blob_name}: {str(e)}")
                    results[blob_name] = False
                
            # Count successes and failures
            success_count = sum(1 for success in results.values() if success)
            failure_count = len(request.blob_names) - success_count
            
            return BatchMoveResponse(
                success=failure_count == 0,
                message=f"Moved {success_count} assets to {normalized_folder or 'root'} successfully" + (f", {failure_count} failed" if failure_count > 0 else ""),
                total=len(request.blob_names),
                results=results,
                target_folder=normalized_folder,
                background_task=False
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def _move_assets_background(
    blob_names: List[str],
    container_name: str,
    target_folder: str,
    azure_storage_service: AzureBlobStorageService
):
    """Background task to move multiple assets to a different folder"""
    try:
        container_client = azure_storage_service.blob_service_client.get_container_client(
            container_name)
        results = {}
        
        for blob_name in blob_names:
            try:
                # Get original blob content and metadata
                content, content_type = azure_storage_service.get_asset_content(
                    blob_name, container_name)
                if not content:
                    print(f"Error: Asset content not found: {blob_name}")
                    results[blob_name] = False
                    continue

                # Get metadata
                metadata = azure_storage_service.get_asset_metadata(
                    blob_name, container_name) or {}

                # Create new blob name with target folder
                file_name = blob_name.split('/')[-1] if '/' in blob_name else blob_name
                new_blob_name = f"{target_folder}{file_name}"

                # Create blob client for new location
                blob_client = container_client.get_blob_client(new_blob_name)

                # Update metadata with new folder path
                metadata['folder_path'] = target_folder

                # Set content type
                from azure.storage.blob import ContentSettings
                content_settings = ContentSettings(content_type=content_type)

                # Upload to new location
                blob_client.upload_blob(data=content, overwrite=True,
                                      metadata=metadata, content_settings=content_settings)

                # Delete original blob after successful copy
                azure_storage_service.delete_asset(blob_name, container_name)
                
                results[blob_name] = True
                print(f"Successfully moved asset from {blob_name} to {new_blob_name}")
            except Exception as e:
                print(f"Error moving asset {blob_name} in background: {str(e)}")
                results[blob_name] = False
                
        # Count successes and failures
        success_count = sum(1 for success in results.values() if success)
        failure_count = len(blob_names) - success_count
        
        print(f"Background batch move complete: {success_count} succeeded, {failure_count} failed")
    except Exception as e:
        print(f"Error in background batch move: {str(e)}")
