#!/bin/bash
set -e

echo "[Build Frontend] Starting frontend build process..."

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please create one based on .env.example"
  exit 1
fi

# Load environment variables
source .env

# Validate required environment variables
if [ -z "$FRONTEND_BUILD_OUTPUT_PATH" ]; then
  echo "Error: FRONTEND_BUILD_OUTPUT_PATH not set in .env"
  exit 1
fi

echo "[Build Frontend] Building Docker image..."
docker build -f Dockerfile.frontend -t cindy-webrtc-frontend:latest .

echo "[Build Frontend] Running build container to output files..."
docker run --rm \
  -v "${FRONTEND_BUILD_OUTPUT_PATH}:/output-destination" \
  cindy-webrtc-frontend:latest

echo "[Build Frontend] ✓ Frontend build completed and deployed to ${FRONTEND_BUILD_OUTPUT_PATH}"
echo "[Build Frontend] Make sure Caddy is configured to serve from this directory"

