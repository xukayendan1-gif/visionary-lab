###############################################
# Base stage (shared between build and final) #
###############################################

FROM ubuntu:22.04 AS base

# Set non-interactive installation and timezone
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

###############
# Build stage #
###############

FROM base AS builder

## Install and configure UV, see https://docs.astral.sh/uv/ for more information

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PROJECT_ENVIRONMENT=/app/.venv

WORKDIR /app

COPY uv.lock pyproject.toml /app/
RUN uv sync \
    --frozen \
    --no-dev \
    --no-install-workspace \
    --no-editable \
    --all-packages

COPY *.py *.md /app/
COPY backend /app/backend

###############
# Final image #
###############

FROM base

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    curl

RUN groupadd -r app
RUN useradd -r -d /app -g app -N app

COPY --from=builder --chown=app:app /app /app
WORKDIR /app

ENV PYTHONUNBUFFERED=1

# Expose the application port
EXPOSE 80
WORKDIR /app

CMD [".venv/bin/python", "backend/main.py"]
