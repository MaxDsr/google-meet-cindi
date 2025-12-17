import { Router, Transport, Producer, Consumer, RtpCapabilities } from 'mediasoup/node/lib/types';
import { getWorker } from './worker';
import { config } from './config';

interface Peer {
  id: string;
  userId: string;
  username: string;
  transports: Map<string, Transport>;
  producers: Map<string, Producer>;
  consumers: Map<string, Consumer>;
}

interface Room {
  id: string;
  router: Router;
  peers: Map<string, Peer>;
  createdAt: number;
}

const rooms = new Map<string, Room>();

/**
 * Create a new room with a mediasoup router
 */
export async function createRoom(roomId: string): Promise<Room> {
  if (rooms.has(roomId)) {
    return rooms.get(roomId)!;
  }

  const worker = getWorker();
  const router = await worker.createRouter({
    mediaCodecs: config.router.mediaCodecs,
  });

  const room: Room = {
    id: roomId,
    router,
    peers: new Map(),
    createdAt: Date.now(),
  };

  rooms.set(roomId, room);
  console.log(`[Room] Created room: ${roomId}`);
  
  return room;
}

/**
 * Get an existing room
 */
export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

/**
 * Delete a room
 */
export function deleteRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (room) {
    room.router.close();
    rooms.delete(roomId);
    console.log(`[Room] Deleted room: ${roomId}`);
  }
}

/**
 * Add a peer to a room
 */
export function addPeer(roomId: string, peerId: string, userId: string, username: string): Peer {
  const room = rooms.get(roomId);
  if (!room) {
    throw new Error(`Room ${roomId} not found`);
  }

  const peer: Peer = {
    id: peerId,
    userId,
    username,
    transports: new Map(),
    producers: new Map(),
    consumers: new Map(),
  };

  room.peers.set(peerId, peer);
  console.log(`[Room] Added peer ${peerId} to room ${roomId}`);
  
  return peer;
}

/**
 * Get a peer from a room
 */
export function getPeer(roomId: string, peerId: string): Peer | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  return room.peers.get(peerId);
}

/**
 * Remove a peer from a room
 */
export function removePeer(roomId: string, peerId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  const peer = room.peers.get(peerId);
  if (!peer) return;

  // Close all transports
  peer.transports.forEach(transport => transport.close());
  
  room.peers.delete(peerId);
  console.log(`[Room] Removed peer ${peerId} from room ${roomId}`);

  // If room is empty, optionally delete it
  if (room.peers.size === 0) {
    console.log(`[Room] Room ${roomId} is empty`);
    // Optionally: deleteRoom(roomId);
  }
}

/**
 * Get router RTP capabilities
 */
export function getRouterRtpCapabilities(roomId: string): RtpCapabilities | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  return room.router.rtpCapabilities;
}

/**
 * Create WebRTC transport
 */
export async function createWebRtcTransport(roomId: string, peerId: string): Promise<any> {
  const room = rooms.get(roomId);
  if (!room) {
    throw new Error(`Room ${roomId} not found`);
  }

  const peer = room.peers.get(peerId);
  if (!peer) {
    throw new Error(`Peer ${peerId} not found in room ${roomId}`);
  }

  const transport = await room.router.createWebRtcTransport({
    listenInfos: config.webRtcTransport.listenInfos,
    enableUdp: config.webRtcTransport.enableUdp,
    enableTcp: config.webRtcTransport.enableTcp,
    preferUdp: config.webRtcTransport.preferUdp,
    initialAvailableOutgoingBitrate: config.webRtcTransport.initialAvailableOutgoingBitrate,
  });

  peer.transports.set(transport.id, transport);

  console.log(`[Room] Created transport ${transport.id} for peer ${peerId}`);

  return {
    id: transport.id,
    iceParameters: transport.iceParameters,
    iceCandidates: transport.iceCandidates,
    dtlsParameters: transport.dtlsParameters,
  };
}

/**
 * Connect transport
 */
export async function connectTransport(
  roomId: string,
  peerId: string,
  transportId: string,
  dtlsParameters: any
): Promise<void> {
  const peer = getPeer(roomId, peerId);
  if (!peer) {
    throw new Error(`Peer ${peerId} not found`);
  }

  const transport = peer.transports.get(transportId);
  if (!transport) {
    throw new Error(`Transport ${transportId} not found`);
  }

  await transport.connect({ dtlsParameters });
  console.log(`[Room] Connected transport ${transportId}`);
}

/**
 * Produce media
 */
export async function produce(
  roomId: string,
  peerId: string,
  transportId: string,
  kind: any,
  rtpParameters: any
): Promise<string> {
  const peer = getPeer(roomId, peerId);
  if (!peer) {
    throw new Error(`Peer ${peerId} not found`);
  }

  const transport = peer.transports.get(transportId);
  if (!transport) {
    throw new Error(`Transport ${transportId} not found`);
  }

  const producer = await transport.produce({ kind, rtpParameters });
  peer.producers.set(producer.id, producer);

  console.log(`[Room] Peer ${peerId} producing ${kind} with producer ${producer.id}`);

  return producer.id;
}

/**
 * Consume media
 */
export async function consume(
  roomId: string,
  peerId: string,
  transportId: string,
  producerId: string,
  rtpCapabilities: RtpCapabilities
): Promise<any> {
  const room = rooms.get(roomId);
  if (!room) {
    throw new Error(`Room ${roomId} not found`);
  }

  const peer = getPeer(roomId, peerId);
  if (!peer) {
    throw new Error(`Peer ${peerId} not found`);
  }

  const transport = peer.transports.get(transportId);
  if (!transport) {
    throw new Error(`Transport ${transportId} not found`);
  }

  // Check if router can consume
  if (!room.router.canConsume({ producerId, rtpCapabilities })) {
    throw new Error('Cannot consume');
  }

  const consumer = await transport.consume({
    producerId,
    rtpCapabilities,
    paused: false,
  });

  peer.consumers.set(consumer.id, consumer);

  console.log(`[Room] Peer ${peerId} consuming with consumer ${consumer.id}`);

  return {
    id: consumer.id,
    producerId,
    kind: consumer.kind,
    rtpParameters: consumer.rtpParameters,
  };
}

/**
 * Get all producers in a room except for a specific peer
 */
export function getOtherPeersProducers(roomId: string, excludePeerId: string): any[] {
  const room = rooms.get(roomId);
  if (!room) return [];

  const producers: any[] = [];

  room.peers.forEach((peer, peerId) => {
    if (peerId !== excludePeerId) {
      peer.producers.forEach(producer => {
        producers.push({
          producerId: producer.id,
          peerId: peerId,
          userId: peer.userId,
          username: peer.username,
          kind: producer.kind,
        });
      });
    }
  });

  return producers;
}

/**
 * Get all peers in a room
 */
export function getRoomPeers(roomId: string): any[] {
  const room = rooms.get(roomId);
  if (!room) return [];

  const peers: any[] = [];
  room.peers.forEach(peer => {
    peers.push({
      peerId: peer.id,
      userId: peer.userId,
      username: peer.username,
    });
  });

  return peers;
}

