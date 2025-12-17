import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { readFileSync, existsSync } from 'fs';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import { createWorker } from './mediasoup/worker';
import {
  createRoom,
  getRoom,
  addPeer,
  removePeer,
  getRouterRtpCapabilities,
  createWebRtcTransport,
  connectTransport,
  produce,
  consume,
  getOtherPeersProducers,
  getRoomPeers,
} from './mediasoup/room';
import { generateMeetingId, isMeetingExpired } from './utils/expiry';
import { deletionQueue } from './storage/deletionQueue';
import usersRouter from './routes/users';
import recordingsRouter from './routes/recordings';

const PORT = parseInt(process.env.PORT || '3001');
const TLS_CERT = process.env.TLS_CERT || '';
const TLS_KEY = process.env.TLS_KEY || '';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [];


console.log(`[Server] PORT: ${PORT}`);
console.log(`[Server] TLS_CERT: ${TLS_CERT}`);
console.log(`[Server] TLS_KEY: ${TLS_KEY}`);
console.log(`[Server] ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}`);

// Create Express app
const app = express();

// Create HTTP or HTTPS server based on TLS configuration
let httpServer;
if (TLS_CERT && TLS_KEY && existsSync(TLS_CERT) && existsSync(TLS_KEY)) {
  const httpsOptions = {
    cert: readFileSync(TLS_CERT),
    key: readFileSync(TLS_KEY),
  };
  httpServer = createHttpsServer(httpsOptions, app);
  console.log('[Server] TLS certificates loaded, running in HTTPS mode');
} else {
  httpServer = createServer(app);
  console.log('[Server] No TLS certificates found, running in HTTP mode');
}

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Cindy WebRTC API Docs',
}));

// Serve OpenAPI spec as JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Routes
app.use('/api/users', usersRouter);
app.use('/api/recordings', recordingsRouter);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     description: Check if the server is running
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin
      if (!origin) return callback(null, true);
      
      if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn(`[Socket.IO CORS] Blocked connection from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  /**
   * Create a new room
   */
  socket.on('createRoom', async (callback) => {
    try {
      const roomId = generateMeetingId();
      await createRoom(roomId);
      
      console.log(`[Socket] Room created: ${roomId}`);
      callback({ roomId });
    } catch (error) {
      console.error('[Socket] Error creating room:', error);
      callback({ error: 'Failed to create room' });
    }
  });

  /**
   * Join a room
   */
  socket.on('joinRoom', async (data, callback) => {
    try {
      const { roomId, userId, username } = data;

      if (!roomId || !userId || !username) {
        return callback({ error: 'Missing required fields' });
      }

      // Check if meeting has expired
      if (isMeetingExpired(roomId)) {
        return callback({ error: 'Meeting link has expired (24h limit)' });
      }

      // Get or create room
      let room = getRoom(roomId);
      if (!room) {
        room = await createRoom(roomId);
      }

      // Add peer to room
      const peer = addPeer(roomId, socket.id, userId, username);
      
      // Join socket room
      socket.join(roomId);

      // Store room and user info in socket data
      socket.data.roomId = roomId;
      socket.data.userId = userId;
      socket.data.username = username;

      // Get other peers in the room
      const peers = getRoomPeers(roomId).filter(p => p.peerId !== socket.id);

      // Notify others in the room
      socket.to(roomId).emit('newPeer', {
        peerId: socket.id,
        userId,
        username,
      });

      console.log(`[Socket] Peer ${socket.id} joined room ${roomId}`);
      callback({ success: true, peers });
    } catch (error) {
      console.error('[Socket] Error joining room:', error);
      callback({ error: 'Failed to join room' });
    }
  });

  /**
   * Get router RTP capabilities
   */
  socket.on('getRouterRtpCapabilities', (data, callback) => {
    try {
      const { roomId } = data;
      const rtpCapabilities = getRouterRtpCapabilities(roomId);
      
      if (!rtpCapabilities) {
        return callback({ error: 'Room not found' });
      }

      callback({ rtpCapabilities });
    } catch (error) {
      console.error('[Socket] Error getting RTP capabilities:', error);
      callback({ error: 'Failed to get RTP capabilities' });
    }
  });

  /**
   * Create WebRTC transport
   */
  socket.on('createWebRtcTransport', async (data, callback) => {
    try {
      const { roomId } = data;
      const transportParams = await createWebRtcTransport(roomId, socket.id);
      callback(transportParams);
    } catch (error) {
      console.error('[Socket] Error creating transport:', error);
      callback({ error: 'Failed to create transport' });
    }
  });

  /**
   * Connect transport
   */
  socket.on('connectTransport', async (data, callback) => {
    try {
      const { roomId, transportId, dtlsParameters } = data;
      await connectTransport(roomId, socket.id, transportId, dtlsParameters);
      callback({ success: true });
    } catch (error) {
      console.error('[Socket] Error connecting transport:', error);
      callback({ error: 'Failed to connect transport' });
    }
  });

  /**
   * Produce media (audio or video)
   */
  socket.on('produce', async (data, callback) => {
    try {
      const { roomId, transportId, kind, rtpParameters } = data;
      const producerId = await produce(roomId, socket.id, transportId, kind, rtpParameters);
      
      // Notify other peers about new producer
      socket.to(roomId).emit('newProducer', {
        peerId: socket.id,
        producerId,
        kind,
      });

      callback({ producerId });
    } catch (error) {
      console.error('[Socket] Error producing:', error);
      callback({ error: 'Failed to produce' });
    }
  });

  /**
   * Consume media from another peer
   */
  socket.on('consume', async (data, callback) => {
    try {
      const { roomId, transportId, producerId, rtpCapabilities } = data;
      const params = await consume(roomId, socket.id, transportId, producerId, rtpCapabilities);
      callback(params);
    } catch (error) {
      console.error('[Socket] Error consuming:', error);
      callback({ error: 'Failed to consume' });
    }
  });

  /**
   * Get existing producers in the room
   */
  socket.on('getProducers', (data, callback) => {
    try {
      const { roomId } = data;
      const producers = getOtherPeersProducers(roomId, socket.id);
      callback({ producers });
    } catch (error) {
      console.error('[Socket] Error getting producers:', error);
      callback({ error: 'Failed to get producers' });
    }
  });

  /**
   * Leave room
   */
  socket.on('leaveRoom', () => {
    handleDisconnect();
  });

  /**
   * Handle disconnect
   */
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
    handleDisconnect();
  });

  function handleDisconnect() {
    const roomId = socket.data.roomId;
    if (roomId) {
      removePeer(roomId, socket.id);
      socket.to(roomId).emit('peerLeft', { peerId: socket.id });
      socket.leave(roomId);
    }
  }
});

// Start server
async function start() {
  try {
    // Create mediasoup worker
    await createWorker();
    console.log('[Server] Mediasoup worker created');

    // Start deletion queue processor
    deletionQueue.start();
    console.log('[Server] Deletion queue started');

    // Start server
    const protocol = TLS_CERT && TLS_KEY ? 'https' : 'http';
    httpServer.listen(PORT, '127.0.0.1', () => {
      console.log(`[Server] Server running on ${protocol}://127.0.0.1:${PORT}`);
      console.log('[Server] Bound to localhost only - accessible via reverse proxy');
      console.log('[Server] Ready to accept connections');
    });
  } catch (error) {
    console.error('[Server] Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[Server] Shutting down...');
  deletionQueue.stop();
  httpServer.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});

// Start the server
start();

