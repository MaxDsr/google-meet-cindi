import { useEffect, useRef, useState } from 'react';

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, { stream: MediaStream; username: string }>;
}

const MOBILE_BREAKPOINT = 640;

export function VideoGrid({ localStream, remoteStreams }: VideoGridProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Track window width for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Calculate total participant count (local + remote)
  const participantCount = 1 + remoteStreams.size;
  const isMobile = windowWidth <= MOBILE_BREAKPOINT;

  // Calculate grid size based on participant count
  // 1 = full screen, 2-4 = 2x2, 5-9 = 3x3, etc.
  const getGridSize = (count: number): number => {
    if (count === 1) return 1;
    return Math.ceil(Math.sqrt(count));
  };

  const gridSize = getGridSize(participantCount);

  // Dynamic grid styles
  const getGridStyle = (): React.CSSProperties => {
    if (isMobile) {
      // Mobile: single column, scrollable
      return {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '12px',
        width: '100%',
        height: 'calc(100vh - 150px)',
        overflowY: 'auto',
      };
    }

    // Desktop: dynamic grid based on participant count
    return {
      display: 'grid',
      gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
      gridTemplateRows: participantCount === 1 ? '1fr' : `repeat(${gridSize}, 1fr)`,
      gap: '12px',
      padding: '20px',
      width: '100%',
      height: 'calc(100vh - 150px)',
      overflowY: 'auto',
    };
  };

  // Dynamic video container styles
  const getVideoContainerStyle = (isFullScreen: boolean): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'relative',
      backgroundColor: '#000',
      borderRadius: '8px',
      overflow: 'hidden',
    };

    if (isMobile) {
      // Mobile: full width, fixed aspect ratio
      return {
        ...baseStyle,
        width: '100%',
        aspectRatio: '16/9',
      };
    }

    if (isFullScreen) {
      // Single participant: fill the container
      return {
        ...baseStyle,
        width: '100%',
        height: '100%',
      };
    }

    // Grid cell: maintain aspect ratio
    return {
      ...baseStyle,
      width: '100%',
      height: '100%',
      minHeight: 0, // Allows grid to shrink items
    };
  };

  const isFullScreen = participantCount === 1 && !isMobile;

  return (
    <div style={getGridStyle()}>
      {/* Local video */}
      <div style={getVideoContainerStyle(isFullScreen)}>
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={styles.video}
        />
        <div style={styles.label}>You (Local)</div>
      </div>

      {/* Remote videos */}
      {Array.from(remoteStreams.entries()).map(([peerId, { stream, username }]) => (
        <RemoteVideo
          key={peerId}
          stream={stream}
          username={username}
          isMobile={isMobile}
        />
      ))}
    </div>
  );
}

function RemoteVideo({
  stream,
  username,
  isMobile,
}: {
  stream: MediaStream;
  username: string;
  isMobile: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    backgroundColor: '#000',
    borderRadius: '8px',
    overflow: 'hidden',
    ...(isMobile
      ? { width: '100%', aspectRatio: '16/9' }
      : { width: '100%', height: '100%', minHeight: 0 }),
  };

  return (
    <div style={containerStyle}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={styles.video}
      />
      <div style={styles.label}>{username}</div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  label: {
    position: 'absolute',
    bottom: '10px',
    left: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: '5px 10px',
    borderRadius: '4px',
    fontSize: '14px',
  },
};
