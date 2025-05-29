# AI Content Lab Project Structure

## Overview
The AI Content Lab is a video generation platform utilizing Azure OpenAI's Sora model. It has a hybrid architecture consisting of a Python backend (FastAPI) and a Next.js frontend, with an additional Streamlit interface for video generation.

## Core Components

### 1. Backend (Python)
- **FastAPI Framework**: Main API server in `backend/main.py`
- **API Endpoints**: Structured in `backend/api/endpoints/` with routes for:
  - Videos: Sora video generation
  - Images: Image generation (skeleton implementation)
  - Gallery: Media asset gallery (skeleton implementation)
  - Environment settings: Configuration validation
- **Core Services**: All services are consolidated in `backend/core/`:
  - `sora.py`: Azure OpenAI Sora video generation client
  - `storage.py`: File storage and management
  - `config.py`: Application configuration with environment variables
  - `__init__.py`: Centralized service initialization
- **Models**: Data models in `backend/models/`
  - `videos.py`: Schemas for video generation endpoints
  - `images.py`: Schemas for image endpoints
  - `common.py`: Shared schema definitions
- **Static Files**: Served from `static/` directory for:
  - Generated videos
  - Uploaded and generated images
  - Other static assets

### 2. Frontend (Next.js)
- **Modern React (v19)**: Latest React framework
- **Next.js 15**: App router architecture
- **Tailwind CSS**: For styling
- **UI Components**: 
  - Radix UI primitives
  - Custom components in `frontend/components/`
- **Key Pages**:
  - Dashboard
  - Video Editor
  - Video UI
  - Gallery
  - Settings
- **Context API**: State management in `frontend/context/`
- **Utilities**: Helper functions in `frontend/utils/`
- **API Services**: API integrations in `frontend/services/`

### 3. Streamlit UI
- **Creator App**: Main entry point in `creator.py`
- **Video Generation**: Implemented in `video-gen.py`
- **Jobs Management**: Handled in `jobs.py`

### 4. Core Video Functionality
- **Sora Integration**: Client for Azure OpenAI's Sora in `backend/core/sora.py`
  - Centralized client initialization in `backend/core/__init__.py`
  - API connection handled using settings from `backend/core/config.py`
- **Video Processing**:
  - Download/export of generated videos
  - File management with proper error handling
- **Storage**: Local file storage with organized directories

### 5. External Dependencies
- **Azure Services**:
  - Azure OpenAI (Sora model for video generation)
  - Optional: Azure OpenAI for LLM services
  - Optional: Azure OpenAI for image generation

### 6. Configuration
- **Environment Variables**: Service-specific variables in `.env` file:
  - `SORA_AOAI_RESOURCE`: Azure OpenAI resource for Sora
  - `SORA_DEPLOYMENT`: Sora deployment name
  - `SORA_AOAI_API_KEY`: API key for Sora
  - Optional LLM and image generation variables
- **API Configuration**: Settings in `backend/core/config.py`
- **Environment Validation**: Status check via `/api/v1/env/status` endpoint

### 7. Development Tools
- **UV Package Manager**: For Python dependency management
- **Package Management**:
  - `requirements.txt` for Python dependencies
  - `package.json` for JavaScript/TypeScript
- **Development Server**: FastAPI development server with hot reloading

## API Endpoints

### Videos Endpoints (`/api/v1/videos`)
- **POST /jobs**: Create a video generation job with Sora
- **GET /jobs/{job_id}**: Get status of a specific generation job
- **GET /jobs**: List all video generation jobs
- **DELETE /jobs/{job_id}**: Delete a specific job
- **DELETE /jobs/failed**: Clean up failed jobs
- **GET /generations/{generation_id}/content**: Download generated video or GIF
- **POST /analyze**: Video content analysis (placeholder)
- **POST /filename/generate**: Generate a filename based on content (placeholder)

### Images Endpoints (`/api/v1/images`)
- **POST /generate**: Generate images (skeleton implementation)
- **POST /list**: List available images (skeleton implementation)
- **POST /delete**: Delete an image (skeleton implementation)

### Gallery Endpoints (`/api/v1/gallery`)
- **GET /**: List all gallery items (skeleton implementation)
- **GET /images**: List image assets (skeleton implementation)
- **GET /videos**: List video assets (skeleton implementation)

### Environment Endpoints (`/api/v1/env`)
- **GET /status**: Check the status of required environment variables

## Data Flow
1. User interacts with the frontend (Next.js)
2. Requests are sent to the FastAPI backend
3. Backend communicates with Azure OpenAI Sora service
4. Generated videos are stored locally in the static directory
5. Content is served back to the frontend for display

## Development Workflow
- Backend server started via `uv run fastapi dev`
- Frontend development using `npm run dev` in the frontend directory

## Environment Setup
1. Copy `.env.example` to `.env` in backend directory
2. Set required environment variables:
   - `SORA_AOAI_RESOURCE`
   - `SORA_DEPLOYMENT`
   - `SORA_AOAI_API_KEY`
3. Optional: Configure LLM and Image Generation services if needed 