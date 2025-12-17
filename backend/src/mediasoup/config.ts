import { RtpCodecCapability, TransportListenInfo, WorkerLogLevel, WorkerLogTag } from 'mediasoup/node/lib/types';

export const config = {
  // Worker settings
  worker: {
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
    logLevel: 'debug' as WorkerLogLevel,
    logTags: [
      'info',
      'ice',
      'dtls',
      'rtp',
      'srtp',
      'rtcp',
    ] as WorkerLogTag[],
  },

  // Router settings
  router: {
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
          'x-google-start-bitrate': 1000,
        },
      },
    ] as RtpCodecCapability[],
  },

  // WebRTC transport settings
  webRtcTransport: {
    listenInfos: [
      {
        protocol: 'udp',
        ip: '0.0.0.0',
        announcedAddress: process.env.ANNOUNCED_IP || '127.0.0.1',
      },
      {
        protocol: 'tcp',
        ip: '0.0.0.0',
        announcedAddress: process.env.ANNOUNCED_IP || '127.0.0.1',
      },
    ] as TransportListenInfo[],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 1000000,
    maxIncomingBitrate: 1500000,
  },

  // Producer options - 480p max
  producer: {
    video: {
      maxWidth: 854,
      maxHeight: 480,
      maxFrameRate: 30,
    },
  },
};

