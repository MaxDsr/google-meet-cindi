#!/bin/bash

echo "[Stop Backend] Stopping backend container..."

if docker ps --format '{{.Names}}' | grep -q '^cindy-webrtc-backend$'; then
  docker stop cindy-webrtc-backend
  docker rm cindy-webrtc-backend
  echo "[Stop Backend] ✓ Backend container stopped and removed"
else
  echo "[Stop Backend] Container is not running"
fi

