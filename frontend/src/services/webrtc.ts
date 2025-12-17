import * as mediasoupClient from 'mediasoup-client';
import { io, Socket } from 'socket.io-client';
import MultiStreamsMixer from 'multistreamsmixer';

type Device = mediasoupClient.Device;
type Transport = mediasoupClient.types.Transport;
type Producer = mediasoupClient.types.Producer;
type Consumer = mediasoupClient.types.Consumer;

// Use relative path - Vite proxy will handle WebSocket connections
// In production, the web server should proxy /socket.io to backend
const SERVER_URL = window.location.origin;

export interface Peer {
  peerId: string;
  userId: string;
  username: string;
  audioConsumer?: Consumer;
  videoConsumer?: Consumer;
  stream?: MediaStream;
}

/**
 * WebRTC Manager using mediasoup-client
 */
export class WebRTCManager {
  private socket: Socket | null = null;
  private device: Device | null = null;
  private sendTransport: Transport | null = null;
  private recvTransport: Transport | null = null;
  private audioProducer: Producer | null = null;
  private videoProducer: Producer | null = null;
  private peers: Map<string, Peer> = new Map();
  private localStream: MediaStream | null = null;
  private roomId: string = '';
  private mixer: MultiStreamsMixer | null = null;
  private audioContext: AudioContext | null = null;
  private audioDestination: MediaStreamAudioDestinationNode | null = null;
  
  // Callbacks
  public onPeerJoined?: (peer: Peer) => void;
  public onPeerLeft?: (peerId: string) => void;
  public onNewProducer?: (data: any) => void;
  public onLocalStream?: (stream: MediaStream) => void;
  public onRemoteStream?: (peerId: string, stream: MediaStream) => void;

  /**
   * Connect to signaling server
   */
  async connect(roomId: string, userId: string, username: string): Promise<void> {
    try {
      this.roomId = roomId;

      // Connect to Socket.IO server
      this.socket = io(SERVER_URL, {
        transports: ['websocket'],
      });

      await new Promise<void>((resolve, reject) => {
        if (!this.socket) return reject(new Error('Socket not initialized'));

        this.socket.on('connect', () => {
          console.log('[WebRTC] Connected to signaling server');
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('[WebRTC] Connection error:', error);
          reject(error);
        });
      });

      // Set up socket event listeners
      this.setupSocketListeners();

      // Join the room
      await this.joinRoom(userId, username);

      // Initialize mediasoup device
      await this.initDevice();

      console.log('[WebRTC] WebRTC setup complete');
    } catch (error) {
      console.error('[WebRTC] Error connecting:', error);
      throw error;
    }
  }

  /**
   * Set up Socket.IO event listeners
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('newPeer', (data) => {
      console.log('[WebRTC] New peer joined:', data);
      const peer: Peer = {
        peerId: data.peerId,
        userId: data.userId,
        username: data.username,
      };
      this.peers.set(data.peerId, peer);
      this.onPeerJoined?.(peer);
    });

    this.socket.on('peerLeft', (data) => {
      console.log('[WebRTC] Peer left:', data.peerId);
      this.peers.delete(data.peerId);
      this.onPeerLeft?.(data.peerId);
    });

    this.socket.on('newProducer', async (data) => {
      console.log('[WebRTC] New producer:', data);
      this.onNewProducer?.(data); // Why this is not being called?
      await this.consumeProducer(data.producerId, data.peerId);
    });

    this.socket.on('error', (data) => {
      console.error('[WebRTC] Server error:', data);
    });
  }

  /**
   * Join a room
   */
  private async joinRoom(userId: string, username: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error('Socket not connected'));

      this.socket.emit('joinRoom', { roomId: this.roomId, userId, username }, (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          console.log('[WebRTC] Joined room successfully');
          // Store existing peers
          if (response.peers) {
            response.peers.forEach((peer: any) => {
              this.peers.set(peer.peerId, peer);
            });
          }
          resolve();
        }
      });
    });
  }

  /**
   * Initialize mediasoup device
   */
  private async initDevice(): Promise<void> {
    try {
      this.device = new mediasoupClient.Device();

      // Get router RTP capabilities from server
      const rtpCapabilities = await this.getRtpCapabilities();

      // Load device with RTP capabilities
      await this.device.load({ routerRtpCapabilities: rtpCapabilities });

      console.log('[WebRTC] Device initialized');
    } catch (error) {
      console.error('[WebRTC] Error initializing device:', error);
      throw error;
    }
  }

  /**
   * Get RTP capabilities from server
   */
  private async getRtpCapabilities(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error('Socket not connected'));

      this.socket.emit('getRouterRtpCapabilities', { roomId: this.roomId }, (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.rtpCapabilities);
        }
      });
    });
  }

  /**
   * Start producing local media (audio and video)
   */
  async startProducing(): Promise<MediaStream> {
    try {
      // Get user media with 480p constraint
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 854, max: 854 },
          height: { ideal: 480, max: 480 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      console.log('[WebRTC] Got local stream');
      this.onLocalStream?.(this.localStream);

      // Create send transport
      await this.createSendTransport();

      // Produce audio and video
      const audioTrack = this.localStream.getAudioTracks()[0];
      const videoTrack = this.localStream.getVideoTracks()[0];

      if (audioTrack) {
        await this.produceTrack(audioTrack, 'audio');
      }

      if (videoTrack) {
        await this.produceTrack(videoTrack, 'video');
      }

      // Request existing producers
      await this.getExistingProducers();

      return this.localStream;
    } catch (error) {
      console.error('[WebRTC] Error starting production:', error);
      throw error;
    }
  }

  /**
   * Create send transport
   */
  private async createSendTransport(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error('Socket not connected'));

      this.socket.emit('createWebRtcTransport', { roomId: this.roomId }, async (response: any) => {
        if (response.error) {
          return reject(new Error(response.error));
        }

        if (!this.device) return reject(new Error('Device not initialized'));

        this.sendTransport = this.device.createSendTransport(response);

        this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
          try {
            await this.connectTransport(this.sendTransport!.id, dtlsParameters);
            callback();
          } catch (error) {
            errback(error as Error);
          }
        });

        this.sendTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
          try {
            const producerId = await this.produce(this.sendTransport!.id, kind, rtpParameters);
            callback({ id: producerId });
          } catch (error) {
            errback(error as Error);
          }
        });

        console.log('[WebRTC] Send transport created');
        resolve();
      });
    });
  }

  /**
   * Create receive transport
   */
  private async createRecvTransport(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error('Socket not connected'));

      this.socket.emit('createWebRtcTransport', { roomId: this.roomId }, async (response: any) => {
        if (response.error) {
          return reject(new Error(response.error));
        }

        if (!this.device) return reject(new Error('Device not initialized'));

        this.recvTransport = this.device.createRecvTransport(response);

        this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
          try {
            await this.connectTransport(this.recvTransport!.id, dtlsParameters);
            callback();
          } catch (error) {
            errback(error as Error);
          }
        });

        console.log('[WebRTC] Recv transport created');
        resolve();
      });
    });
  }

  /**
   * Connect transport
   */
  private async connectTransport(transportId: string, dtlsParameters: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error('Socket not connected'));

      this.socket.emit(
        'connectTransport',
        { roomId: this.roomId, transportId, dtlsParameters },
        (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Produce a track
   */
  private async produceTrack(track: MediaStreamTrack, kind: 'audio' | 'video'): Promise<void> {
    if (!this.sendTransport) {
      throw new Error('Send transport not created');
    }

    const producer = await this.sendTransport.produce({ track });

    if (kind === 'audio') {
      this.audioProducer = producer;
    } else {
      this.videoProducer = producer;
    }

    console.log(`[WebRTC] Producing ${kind} with producer ${producer.id}`);
  }

  /**
   * Produce media on server
   */
  private async produce(transportId: string, kind: string, rtpParameters: any): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error('Socket not connected'));

      this.socket.emit(
        'produce',
        { roomId: this.roomId, transportId, kind, rtpParameters },
        (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.producerId);
          }
        }
      );
    });
  }

  /**
   * Get existing producers in the room
   */
  private async getExistingProducers(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error('Socket not connected'));

      this.socket.emit('getProducers', { roomId: this.roomId }, async (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          // Consume each existing producer
          for (const producer of response.producers) {
            await this.consumeProducer(producer.producerId, producer.peerId);
          }
          resolve();
        }
      });
    });
  }

  /**
   * Consume a producer
   */
  private async consumeProducer(producerId: string, peerId: string): Promise<void> {
    try {
      // Create recv transport if not exists
      if (!this.recvTransport) {
        await this.createRecvTransport();
      }

      if (!this.device || !this.recvTransport) {
        throw new Error('Device or recv transport not initialized');
      }

      // Consume the producer
      const consumerParams = await this.consume(producerId);

      const consumer = await this.recvTransport.consume({
        id: consumerParams.id,
        producerId: consumerParams.producerId,
        kind: consumerParams.kind,
        rtpParameters: consumerParams.rtpParameters,
      });

      // Find the peer this consumer belongs to
      const peer = this.peers.get(peerId);
      if (!peer) {
        console.warn('[WebRTC] Could not find peer for producer:', producerId);
        return;
      }

      // Add consumer to peer
      if (consumer.kind === 'audio') {
        peer.audioConsumer = consumer;
      } else {
        peer.videoConsumer = consumer;
      }

      // Create or update peer stream
      if (!peer.stream) {
        peer.stream = new MediaStream();
      }

      peer.stream.addTrack(consumer.track);
      this.onRemoteStream?.(peerId, peer.stream);

      console.log(`[WebRTC] Consuming ${consumer.kind} from peer ${peerId}`);
    } catch (error) {
      console.error('[WebRTC] Error consuming producer:', error);
    }
  }

  /**
   * Consume media from server
   */
  private async consume(producerId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.device || !this.recvTransport) {
        return reject(new Error('Not initialized'));
      }

      this.socket.emit(
        'consume',
        {
          roomId: this.roomId,
          transportId: this.recvTransport.id,
          producerId,
          rtpCapabilities: this.device.rtpCapabilities,
        },
        (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  /**
   * Toggle microphone
   */
  toggleMic(): boolean {
    if (this.audioProducer) {
      if (this.audioProducer.paused) {
        this.audioProducer.resume();
        return true;
      } else {
        this.audioProducer.pause();
        return false;
      }
    }
    return false;
  }

  /**
   * Toggle camera
   */
  toggleCamera(): boolean {
    if (this.videoProducer) {
      if (this.videoProducer.paused) {
        this.videoProducer.resume();
        return true;
      } else {
        this.videoProducer.pause();
        return false;
      }
    }
    return false;
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Get all peers
   */
  getPeers(): Peer[] {
    return Array.from(this.peers.values());
  }

  /**
   * Get combined stream (local + all remote streams) for recording
   * @deprecated Use getMixedStreamForRecording() instead - MediaRecorder only records 1 video + 1 audio track
   */
  getCombinedStream(): MediaStream {
    const combinedStream = new MediaStream();

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        combinedStream.addTrack(track);
      });
    }

    // Add remote tracks
    this.peers.forEach(peer => {
      if (peer.stream) {
        peer.stream.getTracks().forEach(track => {
          combinedStream.addTrack(track);
        });
      }
    });

    return combinedStream;
  }

  /**
   * Get mixed stream for recording using MultiStreamsMixer
   * Uses dynamic grid layout based on participant count with fixed 1920x1080 canvas
   * Grid sizes: 1=centered, 2-4=2x2, 5-9=3x3, 10-16=4x4, etc.
   */
  getMixedStreamForRecording(): MediaStream {
    // Collect all streams
    const streams: MediaStream[] = [];

    if (this.localStream) {
      streams.push(this.localStream);
    }

    this.peers.forEach(peer => {
      if (peer.stream) {
        streams.push(peer.stream);
      }
    });

    if (streams.length === 0) {
      throw new Error('No streams available to mix');
    }

    // Fixed canvas resolution (Full HD)
    const canvasWidth = 1920;
    const canvasHeight = 1080;

    const streamCount = streams.length;

    // Special case: single participant centered at 854x480
    if (streamCount === 1) {
			console.log("went to single participant");
      const singleWidth = 854;
      const singleHeight = 480;
      const s = streams[0] as MediaStream & { width?: number; height?: number; left?: number; top?: number };
      s.width = singleWidth;
      s.height = singleHeight;
      s.left = 0;
      s.top = 0;

      console.log(`[WebRTC] Single participant centered at ${s.left},${s.top} (${singleWidth}x${singleHeight})`);
    } else {
      // Calculate grid size: smallest square that fits all participants
      // 2-4 -> 2x2, 5-9 -> 3x3, 10-16 -> 4x4, etc.
      const gridSize = Math.ceil(Math.sqrt(streamCount));
      const cellWidth = Math.floor(canvasWidth / gridSize);
      const cellHeight = Math.floor(canvasHeight / gridSize);

      // Position each stream in the grid
      streams.forEach((stream, index) => {
        const col = index % gridSize;
        const row = Math.floor(index / gridSize);

        const s = stream as MediaStream & { width?: number; height?: number; left?: number; top?: number };
        s.width = cellWidth;
        s.height = cellHeight;
        s.left = col * cellWidth;
        s.top = row * cellHeight;
      });

      console.log(`[WebRTC] Grid layout: ${gridSize}x${gridSize} (${cellWidth}x${cellHeight} per cell) for ${streamCount} streams`);
    }

    // Create mixer
    this.mixer = new MultiStreamsMixer(streams);

    // Set canvas dimensions explicitly for fixed 1920x1080 output
    this.mixer.width = canvasWidth;
    this.mixer.height = canvasHeight;

    // Set frame interval for 30fps (1000ms / 30fps ≈ 33ms)
    this.mixer.frameInterval = 33;

    // Start drawing frames (required for video mixing)
    this.mixer.startDrawingFrames();

    console.log(`[WebRTC] Created mixed stream from ${streams.length} streams (${canvasWidth}x${canvasHeight} canvas)`);

    return this.mixer.getMixedStream();
  }

  /**
   * Get audio-only stream for recording using Web Audio API
   * Mixes all audio tracks from local and remote streams
   */
  getAudioOnlyStream(): MediaStream {
    // Create AudioContext if not exists
    this.audioContext = new AudioContext();
    this.audioDestination = this.audioContext.createMediaStreamDestination();

    // Collect all audio tracks
    const audioTracks: MediaStreamTrack[] = [];

    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        audioTracks.push(track);
      });
    }

    this.peers.forEach(peer => {
      if (peer.stream) {
        peer.stream.getAudioTracks().forEach(track => {
          audioTracks.push(track);
        });
      }
    });

    if (audioTracks.length === 0) {
      throw new Error('No audio tracks available to mix');
    }

    // Connect each audio track to the destination
    audioTracks.forEach(track => {
      const source = this.audioContext!.createMediaStreamSource(new MediaStream([track]));
      source.connect(this.audioDestination!);
    });

    console.log(`[WebRTC] Created audio-only stream from ${audioTracks.length} audio tracks`);

    return this.audioDestination.stream;
  }

  /**
   * Get video-only stream for recording using MultiStreamsMixer
   * Creates grid layout with video tracks only (no audio)
   */
  getVideoOnlyStream(): MediaStream {
    // Collect all streams but create new streams with only video tracks
    const videoOnlyStreams: MediaStream[] = [];

    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        videoOnlyStreams.push(new MediaStream(videoTracks));
      }
    }

    this.peers.forEach(peer => {
      if (peer.stream) {
        const videoTracks = peer.stream.getVideoTracks();
        if (videoTracks.length > 0) {
          videoOnlyStreams.push(new MediaStream(videoTracks));
        }
      }
    });

    if (videoOnlyStreams.length === 0) {
      throw new Error('No video tracks available to mix');
    }

    // Fixed canvas resolution (Full HD)
    const canvasWidth = 1920;
    const canvasHeight = 1080;

    const streamCount = videoOnlyStreams.length;

    // Special case: single participant centered at 854x480
    if (streamCount === 1) {
      console.log('[WebRTC] Video-only: single participant');
      const singleWidth = 854;
      const singleHeight = 480;
      const s = videoOnlyStreams[0] as MediaStream & { width?: number; height?: number; left?: number; top?: number };
      s.width = singleWidth;
      s.height = singleHeight;
      s.left = 0;
      s.top = 0;
    } else {
      // Calculate grid size: smallest square that fits all participants
      const gridSize = Math.ceil(Math.sqrt(streamCount));
      const cellWidth = Math.floor(canvasWidth / gridSize);
      const cellHeight = Math.floor(canvasHeight / gridSize);

      // Position each stream in the grid
      videoOnlyStreams.forEach((stream, index) => {
        const col = index % gridSize;
        const row = Math.floor(index / gridSize);

        const s = stream as MediaStream & { width?: number; height?: number; left?: number; top?: number };
        s.width = cellWidth;
        s.height = cellHeight;
        s.left = col * cellWidth;
        s.top = row * cellHeight;
      });

      console.log(`[WebRTC] Video-only grid layout: ${gridSize}x${gridSize} for ${streamCount} streams`);
    }

    // Create mixer with video-only streams
    this.mixer = new MultiStreamsMixer(videoOnlyStreams);

    // Set canvas dimensions
    this.mixer.width = canvasWidth;
    this.mixer.height = canvasHeight;
    this.mixer.frameInterval = 33;

    // Start drawing frames
    this.mixer.startDrawingFrames();

    console.log(`[WebRTC] Created video-only stream from ${videoOnlyStreams.length} streams`);

    // Get mixed stream - this will have video but no audio
    return this.mixer.getMixedStream();
  }

  /**
   * Stop the mixer and audio context when recording stops
   */
  stopMixer(): void {
    if (this.mixer) {
      this.mixer.releaseStreams();
      this.mixer = null;
      console.log('[WebRTC] Mixer stopped and released');
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.audioDestination = null;
      console.log('[WebRTC] AudioContext closed');
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    // Stop mixer if active
    this.stopMixer();

    // Close transports
    this.sendTransport?.close();
    this.recvTransport?.close();

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }

    // Disconnect socket
    if (this.socket) {
      this.socket.emit('leaveRoom');
      this.socket.disconnect();
    }

    // Clear state
    this.peers.clear();
    this.localStream = null;
    this.device = null;

    console.log('[WebRTC] Disconnected');
  }
}

