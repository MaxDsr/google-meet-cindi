import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserId, getUsername, isLoggedIn } from '../services/auth';
import { WebRTCManager, Peer } from '../services/webrtc';
import { CallRecorder } from '../services/recorder';
import { uploadRecording } from '../services/api';
import { VideoGrid } from '../components/VideoGrid';
import { Controls } from '../components/Controls';
import { RecordingMode } from '../types/recording';

export function Meeting() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, { stream: MediaStream; username: string }>>(new Map());
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingMode, setRecordingMode] = useState<RecordingMode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const webrtcRef = useRef<WebRTCManager | null>(null);
  const recorderRef = useRef<CallRecorder>(new CallRecorder());
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if user is logged in
    if (!isLoggedIn()) {
      navigate('/');
      return;
    }

    if (!roomId) {
      setError('Invalid room ID');
      return;
    }

    // Initialize WebRTC
    initWebRTC();

    return () => {
      cleanup();
    };
  }, [roomId, navigate]);

  const initWebRTC = async () => {
    try {
      const userId = getUserId();
      const username = getUsername();

      if (!userId || !username || !roomId) {
        throw new Error('Missing user information');
      }

      // Create WebRTC manager
      const webrtc = new WebRTCManager();
      webrtcRef.current = webrtc;

      // Set up callbacks
      webrtc.onLocalStream = (stream) => {
        setLocalStream(stream);
      };

      webrtc.onPeerJoined = (peer: Peer) => {
        console.log('[Meeting] Peer joined:', peer);
      };

      webrtc.onPeerLeft = (peerId: string) => {
        console.log('[Meeting] Peer left:', peerId);
        setRemoteStreams((prev) => {
          const newMap = new Map(prev);
          newMap.delete(peerId);
          return newMap;
        });
      };

      webrtc.onRemoteStream = (peerId: string, stream: MediaStream) => {
        console.log('[Meeting] Remote stream received from:', peerId);
        const peer = webrtc.getPeers().find(p => p.peerId === peerId);
        setRemoteStreams((prev) => {
          const newMap = new Map(prev);
          newMap.set(peerId, {
            stream,
            username: peer?.username || 'Unknown',
          });
          return newMap;
        });
      };

      // Connect to room
      await webrtc.connect(roomId, userId, username);

      // Start producing media
      await webrtc.startProducing();

      setLoading(false);
    } catch (err: any) {
      console.error('[Meeting] Error initializing WebRTC:', err);
      setError(err.message || 'Failed to join meeting');
      setLoading(false);
    }
  };

  const cleanup = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    if (webrtcRef.current) {
      webrtcRef.current.disconnect();
    }
  };

  const handleToggleMic = () => {
    if (webrtcRef.current) {
      const enabled = webrtcRef.current.toggleMic();
      setMicEnabled(enabled);
    }
  };

  const handleToggleCamera = () => {
    if (webrtcRef.current) {
      const enabled = webrtcRef.current.toggleCamera();
      setCameraEnabled(enabled);
    }
  };

  const handleStartRecording = (mode: RecordingMode) => {
    try {
      if (!webrtcRef.current) {
        throw new Error('WebRTC not initialized');
      }

      // Get the appropriate stream based on recording mode
      let streamToRecord: MediaStream;
      
      switch (mode) {
        case 'audio':
          streamToRecord = webrtcRef.current.getAudioOnlyStream();
          break;
        case 'video':
          streamToRecord = webrtcRef.current.getVideoOnlyStream();
          break;
        case 'both':
        default:
          streamToRecord = webrtcRef.current.getMixedStreamForRecording();
          break;
      }

      recorderRef.current.start(streamToRecord, mode);
      setRecording(true);
      setRecordingMode(mode);
      setRecordingDuration(0);

      // Update duration every second
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      console.log(`[Meeting] Recording started with mode: ${mode}`);
    } catch (err) {
      console.error('[Meeting] Error starting recording:', err);
      alert('Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    try {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      const { blob, duration } = await recorderRef.current.stop();
      const currentMode = recordingMode;
      
      // Stop the mixer to release resources
      webrtcRef.current?.stopMixer();
      
      setRecording(false);
      setRecordingMode(null);

      console.log('[Meeting] Recording stopped, uploading...');

      // Upload recording
      const userId = getUserId();
      const username = getUsername();

      if (!userId || !username || !roomId) {
        throw new Error('Missing user information');
      }

      const title = `Recording - ${new Date().toLocaleString()}`;
      await uploadRecording(userId, roomId, username, title, duration, blob, currentMode || 'both');

      alert('Recording uploaded successfully!');
    } catch (err) {
      console.error('[Meeting] Error stopping recording:', err);
      alert('Failed to save recording');
      // Still try to stop the mixer even if there's an error
      webrtcRef.current?.stopMixer();
      setRecording(false);
      setRecordingMode(null);
    }
  };

  const handleLeave = () => {
    if (confirm('Are you sure you want to leave the meeting?')) {
      cleanup();
      navigate('/');
    }
  };

  const handleCopyLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <h2>Joining meeting...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.error}>
        <h2>❌ Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/')} style={styles.button}>
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Meeting: {roomId?.substring(0, 12)}...</h2>
        <p style={styles.subtitle}>
          Participants: {remoteStreams.size + 1}
        </p>
      </div>

      <VideoGrid localStream={localStream} remoteStreams={remoteStreams} />

      <Controls
        micEnabled={micEnabled}
        cameraEnabled={cameraEnabled}
        recording={recording}
        recordingDuration={recordingDuration}
        recordingMode={recordingMode || undefined}
        onToggleMic={handleToggleMic}
        onToggleCamera={handleToggleCamera}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onLeave={handleLeave}
        onCopyLink={handleCopyLink}
      />
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#1a1a1a',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    backgroundColor: '#2a2a2a',
    padding: '15px 20px',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.3)',
  },
  title: {
    color: 'white',
    margin: '0 0 5px 0',
    fontSize: '20px',
  },
  subtitle: {
    color: '#999',
    margin: '0',
    fontSize: '14px',
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    color: 'white',
  },
  error: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    color: 'white',
    padding: '20px',
    textAlign: 'center',
  },
  button: {
    padding: '12px 24px',
    fontSize: '16px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '20px',
  },
};
