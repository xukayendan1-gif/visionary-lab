# Use Ubuntu 22.04 as base image with Python 3.12
FROM ubuntu:22.04

# Set non-interactive installation and timezone to avoid prompts
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Europe/Berlin

# Install Python 3.12
RUN apt-get update && apt-get install -y --no-install-recommends tzdata software-properties-common gnupg2 curl && \
    apt-key adv --keyserver keyserver.ubuntu.com --recv-keys F23C5A6CF475977595C89F51BA6932366A755776 && \
    add-apt-repository -y ppa:deadsnakes/ppa && \
    apt-get update && \
    apt-get install -y --no-install-recommends python3.12 python3.12-venv python3.12-dev python3-pip && \
    ln -sf /usr/bin/python3.12 /usr/bin/python && \
    ln -sf /usr/bin/pip3 /usr/bin/pip

# Install system dependencies needed for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy the application into the container.
COPY . /app

# Install the application dependencies.
WORKDIR /app
# Since we're using a non-standard project structure with the backend in a subdirectory
# but pyproject.toml in the root, we need to set PYTHONPATH
ENV PYTHONPATH=/app

RUN uv sync --frozen --no-cache

# Add the virtual environment to PATH
ENV PATH="/app/.venv/bin:${PATH}"
ENV PYTHONUNBUFFERED=1

# Create necessary directories
RUN mkdir -p /app/static/uploads /app/static/images /app/static/videos
RUN mkdir -p /app/backend/static/uploads /app/backend/static/images /app/backend/static/videos

# Verify the fastapi command is available
RUN ls -la /app/.venv/bin/ && /app/.venv/bin/fastapi --version

# Expose port
EXPOSE 80

# Run the application using fastapi CLI with a shell wrapper to ensure PATH is set
ENTRYPOINT ["/bin/sh", "-c"]
CMD ["exec /app/.venv/bin/fastapi run backend/main.py --port 80 --host 0.0.0.0"] 
ENTRYPOINT ["/bin/sh", "-c"]
CMD ["exec /app/.venv/bin/fastapi run backend/main.py --port 80 --host 0.0.0.0"] 
