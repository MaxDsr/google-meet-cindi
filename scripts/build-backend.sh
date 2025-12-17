#!/bin/bash
set -e

echo "[Build Backend] Starting backend Docker image build..."

# Build backend Docker image
docker build -f Dockerfile.backend -t cindy-webrtc-backend:latest .

echo "[Build Backend] ✓ Backend image built successfully"
echo "[Build Backend] Image: cindy-webrtc-backend:latest"
echo "[Build Backend] Run './scripts/run-backend.sh' to start the backend container"

