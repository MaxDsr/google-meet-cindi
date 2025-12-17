import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserId, isLoggedIn, clearUser } from '../services/auth';
import {
  getRecordings,
  updateRecordingTitle,
  deleteRecording,
  getVideoUrl,
  Recording,
} from '../services/api';
import { RecordingItem } from '../components/RecordingItem';

export function History() {
  const navigate = useNavigate();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playingRecording, setPlayingRecording] = useState<Recording | null>(null);

  useEffect(() => {
    // Check if user is logged in
    if (!isLoggedIn()) {
      navigate('/');
      return;
    }

    loadRecordings();
  }, [navigate]);

  const loadRecordings = async () => {
    try {
      const userId = getUserId();
      if (!userId) {
        throw new Error('User ID not found');
      }

      const data = await getRecordings(userId);
      setRecordings(data);
      setLoading(false);
    } catch (err) {
      console.error('[History] Error loading recordings:', err);
      setError('Failed to load recordings');
      setLoading(false);
    }
  };

  const handlePlay = (recording: Recording) => {
    setPlayingRecording(recording);
  };

  const handleClosePlayer = () => {
    setPlayingRecording(null);
  };

  const handleRename = async (recordingId: string, newTitle: string) => {
    try {
      const userId = getUserId();
      if (!userId) return;

      await updateRecordingTitle(recordingId, newTitle, userId);
      
      // Update local state
      setRecordings((prev) =>
        prev.map((rec) =>
          rec.recordingId === recordingId ? { ...rec, title: newTitle } : rec
        )
      );
    } catch (err) {
      console.error('[History] Error renaming recording:', err);
      alert('Failed to rename recording');
    }
  };

  const handleDelete = async (recordingId: string) => {
    try {
      const userId = getUserId();
      if (!userId) return;

      await deleteRecording(recordingId, userId);
      
      // Show success message (async deletion)
      alert('Deleted successfully!');
      
      // Remove from local state immediately
      setRecordings((prev) => prev.filter((rec) => rec.recordingId !== recordingId));
    } catch (err) {
      console.error('[History] Error deleting recording:', err);
      alert('Failed to delete recording');
    }
  };

  const handleLogout = () => {
    clearUser();
    navigate('/');
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <h2>Loading recordings...</h2>
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
        <h1 style={styles.title}>📼 My Recordings</h1>
        <div style={styles.headerButtons}>
          <button onClick={() => navigate('/')} style={styles.backButton}>
            ← Back to Home
          </button>
          <button onClick={handleLogout} style={styles.logoutButton}>
            🚪 Logout
          </button>
        </div>
      </div>

      <div style={styles.content}>
        {recordings.length === 0 ? (
          <div style={styles.empty}>
            <h2>No recordings yet</h2>
            <p>Start a meeting and click "Start Recording" to create your first recording!</p>
            <button onClick={() => navigate('/')} style={styles.button}>
              Create Meeting
            </button>
          </div>
        ) : (
          <div style={styles.list}>
            {recordings.map((recording) => (
              <RecordingItem
                key={recording.recordingId}
                recording={recording}
                onPlay={handlePlay}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Media player modal */}
      {playingRecording && (
        <div style={styles.modal} onClick={handleClosePlayer}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{playingRecording.title}</h2>
              <button onClick={handleClosePlayer} style={styles.closeButton}>
                ✕
              </button>
            </div>
            {playingRecording.recordingType === 'audio' ? (
              <div style={styles.audioContainer}>
                <div style={styles.audioIcon}>🎵</div>
                <audio
                  src={getVideoUrl(playingRecording.recordingId)}
                  controls
                  autoPlay
                  style={styles.audio}
                />
              </div>
            ) : (
              <video
                src={getVideoUrl(playingRecording.recordingId)}
                controls
                autoPlay
                style={styles.video}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#1a1a1a',
  },
  header: {
    backgroundColor: '#2a2a2a',
    padding: '20px 40px',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px',
  },
  title: {
    color: 'white',
    margin: '0',
    fontSize: '28px',
  },
  headerButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  backButton: {
    padding: '10px 20px',
    fontSize: '16px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: '10px 20px',
    fontSize: '16px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  content: {
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
  },
  empty: {
    textAlign: 'center',
    color: 'white',
    padding: '60px 20px',
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
    fontWeight: 'bold',
  },
  modal: {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: '12px',
    padding: '20px',
    maxWidth: '1000px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  modalTitle: {
    color: 'white',
    margin: '0',
    fontSize: '20px',
  },
  closeButton: {
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    fontSize: '24px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    borderRadius: '8px',
    backgroundColor: '#000',
  },
  audioContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 20px',
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
  },
  audioIcon: {
    fontSize: '80px',
    marginBottom: '30px',
  },
  audio: {
    width: '100%',
    maxWidth: '500px',
  },
};

