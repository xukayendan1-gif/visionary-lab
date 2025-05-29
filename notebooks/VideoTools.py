# Standard Library Imports
import os
import json
import time
import io
import shutil
import random
import base64
from datetime import timedelta
from typing import List, Dict
from io import BytesIO

import requests
import cv2
import numpy as np
import pandas as pd
from PIL import Image, ImageDraw, ImageFont


class Sora:
    def __init__(self, resource_name, deployment_name, api_key, api_version="preview"):
        """
        Initialize the Sora client.

        Args:
            resource_name (str): The resource name from Azure.
            deployment_name (str): The deployment name.
            api_key (str): The API key.
        """
        self.resource_name = resource_name
        self.deployment_name = deployment_name
        self.api_key = api_key
        self.api_version = api_version
        # Base URL includes the fixed parts of the endpoint.
        self.base_url = (
            f"https://{self.resource_name}.openai.azure.com/openai/v1/video"
        )
        self.headers = {
            "api-key": self.api_key,
            "Content-Type": "application/json"
        }

    def create_video_generation_job(self, prompt, n_seconds, height, width, n_variants=1):
        """
        Create a video generation job.

        Args:
            prompt (str): Text prompt for video generation.
            n_seconds (int): Duration of the video.
            height (int): Desired video height.
            width (int): Desired video width.
            n_variants (int, optional): Number of variants. Defaults to 1.

        Returns:
            dict: JSON response containing the job details.
        """
        url = f"{self.base_url}/generations/jobs?api-version={self.api_version}"
        payload = {
            "model": self.deployment_name,
            "prompt": prompt,
            "n_seconds": n_seconds,
            "height": height,
            "width": width,
            "n_variants": n_variants
        }
        response = requests.post(url, json=payload, headers=self.headers)
        response.raise_for_status()
        return response.json()

    def get_video_generation_job(self, job_id):
        """
        Retrieve the status of a specific video generation job.

        Args:
            job_id (str): The ID of the job.

        Returns:
            dict: JSON response containing job status/details.
        """
        url = f"{self.base_url}/generations/jobs/{job_id}?api-version={self.api_version}"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()

    def delete_video_generation_job(self, job_id):
        """
        Delete a video generation job.

        Args:
            job_id (str): The ID of the job.

        Returns:
            int: HTTP status code (204 indicates success).
        """
        url = f"{self.base_url}/generations/jobs/{job_id}?api-version={self.api_version}"
        response = requests.delete(url, headers=self.headers)
        response.raise_for_status()
        return response.status_code

    def list_video_generation_jobs(self, before=None, after=None, limit=10, statuses=None):
        """
        List video generation jobs.

        Args:
            before (str, optional): Return jobs before this ID.
            after (str, optional): Return jobs after this ID.
            limit (int, optional): Maximum number of jobs to return.
            statuses (list, optional): List of job statuses to filter (e.g., ["queued", "processing"]).

        Returns:
            dict: JSON response containing a list of jobs.
        """
        url = f"{self.base_url}/generations/jobs?api-version={self.api_version}"
        params = {"limit": limit}
        if before:
            params["before"] = before
        if after:
            params["after"] = after
        if statuses:
            # Expecting a list of statuses; join them with commas.
            params["statuses"] = ",".join(statuses)
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()

    def get_video_generation(self, generation_id):
        """
        Retrieve details of a specific video generation.

        Args:
            generation_id (str): The generation ID.

        Returns:
            dict: JSON response containing video generation details.
        """
        url = f"{self.base_url}/generations/{generation_id}?api-version={self.api_version}"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()

    def get_video_generation_video_content(self, generation_id, file_name, target_folder='videos', quality='high'):
        """
        Download the video content for a given generation as an MP4 file to the local folder.

        Args:
            generation_id (str): The generation ID.
            file_name (str): The filename to save the video as (include .mp4 extension).
            target_folder (str): The folder to save the video to (default: 'videos').
            quality (str): The video quality ('high' or 'low', default: 'high').

        Returns:
            str: The path to the downloaded file.
        """
        if not os.path.exists(target_folder):
            os.makedirs(target_folder, exist_ok=True)

        file_path = os.path.join(target_folder, file_name)

        url = f"{self.base_url}/generations/{generation_id}/content/video?api-version={self.api_version}"
        params = {'quality': quality}
        response = requests.get(url, headers=self.headers,
                                params=params, stream=True)
        response.raise_for_status()

        with open(file_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)

        return file_path

    def get_video_generation_video_stream(self, generation_id, quality='high'):
        """
        Retrieve video content as an in-memory bytes stream.

        Args:
            generation_id (str): The generation ID.
            quality (str): The video quality ('high' or 'low', default: 'high').

        Returns:
            io.BytesIO: In-memory stream containing the video data.
        """
        url = f"{self.base_url}/generations/{generation_id}/content/video?api-version={self.api_version}"
        params = {'quality': quality}
        response = requests.get(url, headers=self.headers,
                                params=params, stream=True)
        response.raise_for_status()

        video_stream = io.BytesIO()
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                video_stream.write(chunk)
        video_stream.seek(0)
        return video_stream

    def get_video_generation_thumbnail(self, generation_id):
        """
        Retrieve the thumbnail image for a video generation as a PIL.Image object (in memory).

        Args:
            generation_id (str): The generation ID.

        Returns:
            PIL.Image.Image: The thumbnail image.
        """
        url = f"{self.base_url}/generations/{generation_id}/content/thumbnail?api-version={self.api_version}"
        # Remove Content-Type, not needed for GET
        headers = {k: v for k, v in self.headers.items() if k.lower()
                   != "content-type"}
        response = requests.get(url, headers=headers, stream=True)
        response.raise_for_status()
        # Load into BytesIO and open as image
        image_stream = io.BytesIO(response.content)
        image = Image.open(image_stream)
        return image


class VideoExtractor:
    """Extract raw frames from a video together with precise timestamps (hh:mm:ss.mmm)."""

    def __init__(self, uri: str):
        self.uri = uri
        self.cap = cv2.VideoCapture(uri)
        if not self.cap.isOpened():
            raise ValueError("Error opening video file")
        self.fps = self.cap.get(cv2.CAP_PROP_FPS)
        self.frame_count = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.duration = self.frame_count / self.fps

    # Internal helpers
    def _grab_frame(self, frame_index: int) -> Dict[str, str]:
        """Return a single frame (JPEG-base64) and its timestamp string."""
        self.cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
        ret, frame = self.cap.read()
        if not ret:
            return {}

        # Compute timestamp string
        timestamp_sec = frame_index / self.fps
        minutes = int(timestamp_sec // 60)
        seconds = int(timestamp_sec % 60)
        milliseconds = int((timestamp_sec - int(timestamp_sec)) * 1000)
        timestamp = f"{minutes:02}:{seconds:02}:{milliseconds:03}"

        # Encode JPEG → base64
        _, buffer = cv2.imencode(".jpg", frame)
        return {
            "timestamp": timestamp,
            "frame_base64": base64.b64encode(buffer).decode("utf-8"),
        }

    # Public API
    def extract_video_frames(self, interval: float) -> List[Dict[str, str]]:
        """Extract frames every *interval* seconds (no visual overlay)."""
        frame_indices = (np.arange(0, self.duration, interval)
                         * self.fps).astype(int)
        return [f for idx in frame_indices if (f := self._grab_frame(idx))]

    def extract_n_video_frames(self, n: int) -> List[Dict[str, str]]:
        """Extract *n* equally spaced frames across the whole video."""
        if n <= 0:
            raise ValueError("n must be > 0")
        if n > self.frame_count:
            raise ValueError("n cannot exceed total frame count")

        frame_indices = (
            np.linspace(0, self.duration, n, endpoint=False) * self.fps
        ).astype(int)
        return [f for idx in frame_indices if (f := self._grab_frame(idx))]


class VideoAnalyzer:
    """Send frames with timestamps to an OpenAI multimodal chat model."""

    def __init__(self, openai_client, model: str):
        self.openai_client = openai_client
        self.model = model

    def video_chat(
        self,
        frames: List[Dict[str, str]],
        system_message: str,
        transcription_note: str = None,
        max_retries: int = 3,
        retry_delay: int = 2,
    ) -> dict:
        # Build multimodal content: [image, timestamp text, image, timestamp text, ..., note]
        content_segments = []
        for f in frames:
            content_segments.append(
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpg;base64,{f['frame_base64']}",
                        "detail": "auto",
                    },
                }
            )
            content_segments.append(
                {"type": "text", "text": f"timestamp: {f['timestamp']}"})

        if transcription_note:
            content_segments.append(
                {"type": "text", "text": transcription_note})

        messages = [
            {"role": "system", "content": system_message},
            {
                "role": "user",
                "content": "These are the frames from the video, each followed by its timestamp.",
            },
            {"role": "user", "content": content_segments},
        ]

        for attempt in range(max_retries):
            if attempt:
                logger.info(
                    "Retrying VideoAnalyzer.video_chat() - attempt %s", attempt)
                time.sleep(retry_delay)

            response = self.openai_client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0,
                seed=0,
                response_format={"type": "json_object"},
            )

            try:
                return json.loads(response.choices[0].message.content)
            except (json.JSONDecodeError, ValueError):
                logger.warning("Invalid JSON returned by LLM - retrying ...")

        raise RuntimeError(
            "Failed to obtain a valid JSON response from the model")


def get_video_metadata(video_path):
    """
    Returns duration (s), fps, resolution (WxH), and bitrate (kbps) for a video file.

    Args:
        video_path (str): Path to the video file.

    Returns:
        dict: Dictionary with keys: duration, fps, resolution, bitrate.
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"File not found: {video_path}")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("Error opening video file.")

    # Get properties
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Duration in seconds
    duration = frame_count / fps if fps else 0

    # File size in bits
    file_size_bytes = os.path.getsize(video_path)
    file_size_bits = file_size_bytes * 8

    # Bitrate in kilobits per second (kbps)
    bitrate = (file_size_bits / duration) / 1000 if duration else 0

    cap.release()
    return {
        "duration": round(duration, 2),
        "fps": round(fps, 2),
        "resolution": f"{width}x{height}",
        "bitrate_kbps": round(bitrate, 2)
    }
