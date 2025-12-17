import { useState, useRef, useEffect } from 'react';
import { RecordingMode, RECORDING_MODE_CONFIG } from '../types/recording';

interface ControlsProps {
  micEnabled: boolean;
  cameraEnabled: boolean;
  recording: boolean;
  recordingDuration: number;
  recordingMode?: RecordingMode;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onStartRecording: (mode: RecordingMode) => void;
  onStopRecording: () => void;
  onLeave: () => void;
  onCopyLink: () => void;
}

export function Controls({
  micEnabled,
  cameraEnabled,
  recording,
  recordingDuration,
  recordingMode,
  onToggleMic,
  onToggleCamera,
  onStartRecording,
  onStopRecording,
  onLeave,
  onCopyLink,
}: ControlsProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRecordingOptionClick = (mode: RecordingMode) => {
    setDropdownOpen(false);
    onStartRecording(mode);
  };

  const getModeLabel = (mode: RecordingMode): string => {
    const config = RECORDING_MODE_CONFIG[mode];
    return `${config.icon} ${config.label}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.controls}>
        {/* Mic toggle */}
        <button
          onClick={onToggleMic}
          style={{
            ...styles.button,
            backgroundColor: micEnabled ? '#4CAF50' : '#f44336',
          }}
          title={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          {micEnabled ? '🎤 Mic On' : '🎤 Mic Off'}
        </button>

        {/* Camera toggle */}
        <button
          onClick={onToggleCamera}
          style={{
            ...styles.button,
            backgroundColor: cameraEnabled ? '#4CAF50' : '#f44336',
          }}
          title={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {cameraEnabled ? '📹 Camera On' : '📹 Camera Off'}
        </button>

        {/* Recording dropdown or stop button */}
        {!recording ? (
          <div ref={dropdownRef} style={styles.dropdownContainer}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{ ...styles.button, backgroundColor: '#2196F3' }}
              title="Start recording"
            >
              ⏺ Record ▼
            </button>
            {dropdownOpen && (
              <div style={styles.dropdownMenu}>
                {(['audio', 'video', 'both'] as RecordingMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleRecordingOptionClick(mode)}
                    style={styles.dropdownItem}
                  >
                    {getModeLabel(mode)}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onStopRecording}
            style={{ ...styles.button, backgroundColor: '#f44336' }}
            title="Stop recording"
          >
            ⏹ Stop {recordingMode ? getModeLabel(recordingMode) : ''} ({formatDuration(recordingDuration)})
          </button>
        )}

        {/* Copy link */}
        <button
          onClick={onCopyLink}
          style={{ ...styles.button, backgroundColor: '#FF9800' }}
          title="Copy meeting link"
        >
          🔗 Copy Link
        </button>

        {/* Leave button */}
        <button
          onClick={onLeave}
          style={{ ...styles.button, backgroundColor: '#9E9E9E' }}
          title="Leave meeting"
        >
          🚪 Leave
        </button>
      </div>

      {/* Recording indicator */}
      {recording && (
        <div style={styles.recordingIndicator}>
          <span style={styles.recordingDot}>●</span>
          Recording {recordingMode ? `(${RECORDING_MODE_CONFIG[recordingMode].label})` : ''}: {formatDuration(recordingDuration)}
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'fixed',
    bottom: '0',
    left: '0',
    right: '0',
    backgroundColor: '#1a1a1a',
    padding: '15px',
    boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.3)',
  },
  controls: {
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
    flexWrap: 'wrap',
  },
  button: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
  },
  dropdownContainer: {
    position: 'relative',
    display: 'inline-block',
  },
  dropdownMenu: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: '8px',
    backgroundColor: '#2a2a2a',
    borderRadius: '8px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
    minWidth: '180px',
    zIndex: 1000,
  },
  dropdownItem: {
    display: 'block',
    width: '100%',
    padding: '12px 20px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  recordingIndicator: {
    textAlign: 'center',
    color: 'white',
    marginTop: '10px',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  recordingDot: {
    color: '#f44336',
    animation: 'blink 1s infinite',
    marginRight: '5px',
  },
};
