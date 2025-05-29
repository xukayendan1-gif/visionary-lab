import requests
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Sora:
    def __init__(self, resource_name, deployment_name, api_key, api_version="preview"):
        self.resource_name = resource_name
        self.deployment_name = deployment_name
        self.api_key = api_key
        self.api_version = api_version
        self.base_url = f"https://{self.resource_name}.openai.azure.com/openai/v1/video"

        self.headers = {
            "api-key": self.api_key,
            "Content-Type": "application/json"
        }
        logger.info(
            f"Initialized Sora client with resource: {resource_name}, deployment: {deployment_name}")

    def create_video_generation_job(self, prompt, n_seconds, height, width, n_variants=1):
        url = f"{self.base_url}/generations/jobs?api-version={self.api_version}"
        payload = {
            "model": self.deployment_name,
            "prompt": prompt,
            "n_seconds": n_seconds,
            "height": height,
            "width": width,
            "n_variants": n_variants
        }
        logger.info(
            f"Creating video generation job with prompt: {prompt[:50]}...")
        response = requests.post(url, json=payload, headers=self.headers)
        response.raise_for_status()
        return response.json()

    def get_video_generation_job(self, job_id):
        url = f"{self.base_url}/generations/jobs/{job_id}?api-version={self.api_version}"
        logger.info(f"Getting video generation job: {job_id}")
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()

    def delete_video_generation_job(self, job_id):
        url = f"{self.base_url}/generations/jobs/{job_id}?api-version={self.api_version}"
        logger.info(f"Deleting video generation job: {job_id}")
        response = requests.delete(url, headers=self.headers)
        response.raise_for_status()
        return response.status_code

    def list_video_generation_jobs(self, before=None, after=None, limit=10, statuses=None):
        url = f"{self.base_url}/generations/jobs?api-version={self.api_version}"
        params = {"limit": limit}
        if before:
            params["before"] = before
        if after:
            params["after"] = after
        if statuses:
            params["statuses"] = ",".join(statuses)
        logger.info(f"Listing video generation jobs with params: {params}")
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()

    def get_video_generation_video_content(self, generation_id, file_name, target_folder='videos'):
        """
        Download the video content for a given generation as an MP4 file to the local folder.

        Args:
            generation_id (str): The generation ID.
            file_name (str): The filename to save the video as (include .mp4 extension).
            target_folder (str): The folder to save the video to (default: 'videos').

        Returns:
            str: The path to the downloaded file.
        """
        url = f"{self.base_url}/generations/{generation_id}/content/video?api-version={self.api_version}"

        # Create directory if it doesn't exist
        os.makedirs(target_folder, exist_ok=True)

        file_path = os.path.join(target_folder, file_name)

        logger.info(
            f"Downloading video content for generation {generation_id} to {file_path}")

        # Use the same headers as in the notebook - important!
        response = requests.get(url, headers=self.headers, stream=True)
        response.raise_for_status()

        with open(file_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:  # Filter out keep-alive chunks
                    f.write(chunk)

        logger.info(f"Successfully downloaded video to {file_path}")
        return file_path
