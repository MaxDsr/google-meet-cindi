import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Cindy WebRTC API',
      version: '1.0.0',
      description: `
# Overview

Backend API for the Cindy WebRTC video conferencing application with mediasoup SFU.

## Features

- **User Management**: Simple username-based registration
- **Recording Management**: Upload, list, stream, update, and delete recordings
- **Real-time Communication**: WebSocket-based signaling for WebRTC

---

## WebSocket Events (Socket.IO)

Connect to the server via Socket.IO at the same host/port.

### Room Management

| Event | Direction | Description |
|-------|-----------|-------------|
| \`createRoom\` | Client → Server | Creates a new room. Returns \`{ roomId }\` |
| \`joinRoom\` | Client → Server | Join a room. Payload: \`{ roomId, userId, username }\`. Returns \`{ success, peers }\` |
| \`leaveRoom\` | Client → Server | Leave the current room |
| \`newPeer\` | Server → Client | Emitted when a new peer joins. Payload: \`{ peerId, userId, username }\` |
| \`peerLeft\` | Server → Client | Emitted when a peer leaves. Payload: \`{ peerId }\` |

### WebRTC Signaling

| Event | Direction | Description |
|-------|-----------|-------------|
| \`getRouterRtpCapabilities\` | Client → Server | Get router RTP capabilities. Payload: \`{ roomId }\`. Returns \`{ rtpCapabilities }\` |
| \`createWebRtcTransport\` | Client → Server | Create a WebRTC transport. Payload: \`{ roomId }\`. Returns transport params |
| \`connectTransport\` | Client → Server | Connect transport. Payload: \`{ roomId, transportId, dtlsParameters }\` |
| \`produce\` | Client → Server | Start producing media. Payload: \`{ roomId, transportId, kind, rtpParameters }\`. Returns \`{ producerId }\` |
| \`consume\` | Client → Server | Consume media from another peer. Payload: \`{ roomId, transportId, producerId, rtpCapabilities }\` |
| \`getProducers\` | Client → Server | Get existing producers. Payload: \`{ roomId }\`. Returns \`{ producers }\` |
| \`newProducer\` | Server → Client | Emitted when a peer starts producing. Payload: \`{ peerId, producerId, kind }\` |

---
      `,
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
      {
        name: 'Users',
        description: 'User registration and management',
      },
      {
        name: 'Recordings',
        description: 'Recording upload, management, and streaming',
      },
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'Unique user identifier',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            username: {
              type: 'string',
              description: 'Username',
              example: 'john_doe',
            },
            createdAt: {
              type: 'number',
              description: 'Unix timestamp of creation',
              example: 1702831200000,
            },
          },
        },
        Recording: {
          type: 'object',
          properties: {
            recordingId: {
              type: 'string',
              description: 'Unique recording identifier',
              example: 'user123-rec-abc-1702831200000',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'Owner user ID',
            },
            meetingId: {
              type: 'string',
              description: 'Associated meeting ID',
            },
            username: {
              type: 'string',
              description: 'Username of the recorder',
            },
            title: {
              type: 'string',
              description: 'Recording title',
              example: 'Team Meeting - Dec 17',
            },
            filename: {
              type: 'string',
              description: 'Stored filename',
            },
            duration: {
              type: 'number',
              description: 'Duration in milliseconds',
            },
            createdAt: {
              type: 'number',
              description: 'Unix timestamp of creation',
            },
            recordingType: {
              type: 'string',
              enum: ['audio', 'video', 'both'],
              description: 'Type of recording',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/server.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

