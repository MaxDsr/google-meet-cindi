import { useState } from 'react';
import { Recording } from '../services/api';
import { RecordingMode, RECORDING_MODE_CONFIG } from '../types/recording';

interface RecordingItemProps {
  recording: Recording;
  onPlay: (recording: Recording) => void;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
}

export function RecordingItem({ recording, onPlay, onRename, onDelete }: RecordingItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(recording.title);

  const handleRename = () => {
    if (title.trim() && title !== recording.title) {
      onRename(recording.recordingId, title.trim());
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this recording?')) {
      onDelete(recording.recordingId);
    }
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRecordingTypeBadge = (type?: RecordingMode) => {
    const mode = type || 'both';
    const config = RECORDING_MODE_CONFIG[mode];
    
    const badgeColors: Record<RecordingMode, string> = {
      audio: '#9C27B0',  // Purple for audio
      video: '#FF5722',  // Orange for video
      both: '#2196F3',   // Blue for both
    };

    return (
      <span
        style={{
          ...styles.badge,
          backgroundColor: badgeColors[mode],
        }}
        title={config.label}
      >
        {config.icon} {config.label}
      </span>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.info}>
        <div style={styles.titleRow}>
          {isEditing ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') {
                  setTitle(recording.title);
                  setIsEditing(false);
                }
              }}
              autoFocus
              style={styles.input}
            />
          ) : (
            <h3 style={styles.title}>{recording.title}</h3>
          )}
          {getRecordingTypeBadge(recording.recordingType)}
        </div>
        
        <div style={styles.metadata}>
          <span>📅 {formatDate(recording.createdAt)}</span>
          <span>⏱️ {formatDuration(recording.duration)}</span>
          <span>🎬 Meeting: {recording.meetingId.substring(0, 8)}...</span>
        </div>
      </div>

      <div style={styles.actions}>
        <button
          onClick={() => onPlay(recording)}
          style={{ ...styles.button, backgroundColor: '#4CAF50' }}
          title="Play recording"
        >
          ▶️ Play
        </button>

        <button
          onClick={() => setIsEditing(true)}
          style={{ ...styles.button, backgroundColor: '#2196F3' }}
          title="Rename recording"
        >
          ✏️ Rename
        </button>

        <button
          onClick={handleDelete}
          style={{ ...styles.button, backgroundColor: '#f44336' }}
          title="Delete recording"
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#2a2a2a',
    borderRadius: '8px',
    marginBottom: '15px',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.3)',
    flexWrap: 'wrap',
    gap: '15px',
  },
  info: {
    flex: '1',
    minWidth: '300px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '10px',
  },
  title: {
    margin: '0',
    color: 'white',
    fontSize: '18px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'white',
    whiteSpace: 'nowrap',
  },
  input: {
    padding: '8px',
    fontSize: '16px',
    borderRadius: '4px',
    border: '2px solid #4CAF50',
    width: '100%',
    maxWidth: '400px',
  },
  metadata: {
    display: 'flex',
    gap: '20px',
    color: '#999',
    fontSize: '14px',
    flexWrap: 'wrap',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  button: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
  },
};
