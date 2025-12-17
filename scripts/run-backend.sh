#!/bin/bash
set -e

echo "[Run Backend] Starting backend container..."

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please create one based on .env.example"
  exit 1
fi

# Load environment variables
source .env

# Validate required environment variables
if [ -z "$DATA_PATH" ]; then
  echo "Error: DATA_PATH not set in .env"
  exit 1
fi

# Create data directory if it doesn't exist
mkdir -p "${DATA_PATH}"
echo "[Run Backend] Data directory: ${DATA_PATH}"

# Stop existing container if running
if docker ps -a --format '{{.Names}}' | grep -q '^cindy-webrtc-backend$'; then
  echo "[Run Backend] Stopping existing container..."
  docker stop cindy-webrtc-backend 2>/dev/null || true
  docker rm cindy-webrtc-backend 2>/dev/null || true
fi

# Run backend container
echo "[Run Backend] Starting container with --network host..."
docker run -d \
  --name cindy-webrtc-backend \
  --network host \
  --restart unless-stopped \
  --env-file backend/.env \
  -v "${DATA_PATH}:/app/backend/data" \
  cindy-webrtc-backend:latest

echo "[Run Backend] ✓ Backend container started successfully"
echo "[Run Backend] Container name: cindy-webrtc-backend"
echo "[Run Backend] Network mode: host (binds to 127.0.0.1:PORT)"
echo "[Run Backend] Data volume: ${DATA_PATH}"
echo "[Run Backend] Restart policy: unless-stopped"
echo ""
echo "[Run Backend] View logs with: docker logs -f cindy-webrtc-backend"
echo "[Run Backend] Stop with: ./scripts/stop-backend.sh"
echo ""
echo "[Run Backend] Showing logs (Ctrl+C to exit, container continues running)..."
docker logs -f cindy-webrtc-backend

