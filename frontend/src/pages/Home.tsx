import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerOrLogin, getUsername, getUserId, isLoggedIn, clearUser } from '../services/auth';

export function Home() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is already logged in
    if (isLoggedIn()) {
      setLoggedIn(true);
      setCurrentUsername(getUsername() || '');
      setCurrentUserId(getUserId() || '');
    }
  }, []);

  const handleRegister = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await registerOrLogin(username.trim());
      setLoggedIn(true);
      setCurrentUsername(user.username);
      setCurrentUserId(user.userId);
      setUsername('');
    } catch (err) {
      setError('Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = () => {
    if (!loggedIn) {
      setError('Please register/login first');
      return;
    }

    // Generate meeting ID (will be done properly on backend)
    const meetingId = `${Math.random().toString(36).substring(2, 10)}-${Date.now()}`;
    navigate(`/meeting/${meetingId}`);
  };

  const handleJoinMeeting = () => {
    if (!loggedIn) {
      setError('Please register/login first');
      return;
    }

    if (!joinRoomId.trim()) {
      setError('Please enter a meeting ID');
      return;
    }

    navigate(`/meeting/${joinRoomId.trim()}`);
  };

  const handleLogout = () => {
    clearUser();
    setLoggedIn(false);
    setCurrentUsername('');
    setCurrentUserId('');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🎥 Google Meet Clone</h1>
        <p style={styles.subtitle}>Google Meet Clone with Recording</p>

        {!loggedIn ? (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Enter Your Name</h2>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
              placeholder="Your display name"
              style={styles.input}
              disabled={loading}
            />
            <button
              onClick={handleRegister}
              style={styles.primaryButton}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Continue'}
            </button>
          </div>
        ) : (
          <>
            <div style={styles.userInfo}>
              <p style={styles.welcomeText}>
                Welcome, <strong>{currentUsername}</strong>!
              </p>
              <p style={styles.userId}>User ID: {currentUserId.substring(0, 8)}...</p>
              <button onClick={handleLogout} style={styles.logoutButton}>
                🚪 Logout
              </button>
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Create a Meeting</h2>
              <button onClick={handleCreateMeeting} style={styles.primaryButton}>
                📹 Create New Meeting
              </button>
            </div>

            <div style={styles.divider}>OR</div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Join a Meeting</h2>
              <input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinMeeting()}
                placeholder="Enter meeting ID"
                style={styles.input}
              />
              <button onClick={handleJoinMeeting} style={styles.secondaryButton}>
                🚪 Join Meeting
              </button>
            </div>

            <div style={styles.divider} />

            <div style={styles.section}>
              <button
                onClick={() => navigate('/history')}
                style={styles.secondaryButton}
              >
                📼 View My Recordings
              </button>
            </div>
          </>
        )}

        {error && <div style={styles.error}>{error}</div>}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: '20px',
  },
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
  },
  title: {
    fontSize: '36px',
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'white',
    margin: '0 0 10px 0',
  },
  subtitle: {
    fontSize: '16px',
    textAlign: 'center',
    color: '#999',
    margin: '0 0 30px 0',
  },
  section: {
    marginBottom: '25px',
  },
  sectionTitle: {
    fontSize: '18px',
    color: 'white',
    marginBottom: '15px',
  },
  userInfo: {
    backgroundColor: '#1a1a1a',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '25px',
    textAlign: 'center',
  },
  welcomeText: {
    color: 'white',
    fontSize: '18px',
    margin: '0 0 5px 0',
  },
  userId: {
    color: '#999',
    fontSize: '14px',
    margin: '0',
  },
  logoutButton: {
    marginTop: '10px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  input: {
    width: '100%',
    padding: '15px',
    fontSize: '16px',
    borderRadius: '8px',
    border: '2px solid #444',
    backgroundColor: '#1a1a1a',
    color: 'white',
    marginBottom: '15px',
    boxSizing: 'border-box',
  },
  primaryButton: {
    width: '100%',
    padding: '15px',
    fontSize: '18px',
    fontWeight: 'bold',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 10px rgba(76, 175, 80, 0.3)',
  },
  secondaryButton: {
    width: '100%',
    padding: '15px',
    fontSize: '18px',
    fontWeight: 'bold',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 10px rgba(33, 150, 243, 0.3)',
  },
  divider: {
    textAlign: 'center',
    color: '#666',
    margin: '25px 0',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  error: {
    backgroundColor: '#f44336',
    color: 'white',
    padding: '12px',
    borderRadius: '8px',
    marginTop: '15px',
    textAlign: 'center',
  },
};

