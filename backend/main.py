from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import argparse
import os
import logging

from core.config import settings
from api.endpoints import images, gallery, env

# Configure logging to suppress Azure Blob Storage verbose logs
logging.getLogger('azure.core.pipeline.policies.http_logging_policy').setLevel(
    logging.WARNING)

# Create directories if they don't exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.IMAGE_DIR, exist_ok=True)
os.makedirs(settings.VIDEO_DIR, exist_ok=True)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this with proper origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include routers
app.include_router(
    images.router, prefix=f"{settings.API_V1_STR}/images", tags=["images"])
app.include_router(
    gallery.router, prefix=f"{settings.API_V1_STR}/gallery", tags=["gallery"])
app.include_router(env.router, prefix=f"{settings.API_V1_STR}", tags=["env"])
# app.include_router(organizer.router, prefix=f"{settings.API_V1_STR}/organizer", tags=["organizer"])


@app.get("/")
def read_root():
    return {"message": "Welcome to AI Content Lab API"}


@app.get(f"{settings.API_V1_STR}/health")
def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    # Set up command-line argument parsing
    parser = argparse.ArgumentParser(
        description="Run the Visionary Lab backend server")
    parser.add_argument(
        "--port", type=int, help="Port to run the server on (default: 8000 or PORT env var)")
    args = parser.parse_args()

    # Use command-line port if specified, otherwise use environment PORT variable,
    # and finally fall back to default 8000
    port = args.port if args.port is not None else int(
        os.environ.get("PORT", 80))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
