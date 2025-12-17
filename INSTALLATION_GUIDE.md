# Cindy WebRTC - Google Meet Clone

A minimal Google Meet-style video conferencing application with recording capabilities built with mediasoup SFU, React, and TypeScript.

## 🌐 Live Demo

**Try the app now:** [https://google-meet.maxim-dicusari.com/](https://google-meet.maxim-dicusari.com/)

---

## ✨ Features

- ✅ Create or join video meetings via shareable links
- ✅ Real-time video and audio communication (max 480p)
- ✅ Per-user client-side recording with replay
- ✅ Time-sensitive meeting links (24-hour expiry)
- ✅ Pseudo-authentication with persistent user IDs
- ✅ Recording management (list, rename, delete)
- ✅ Async deletion for better UX
- ✅ Opus audio codec for high-quality sound
- ✅ mediasoup SFU for scalable video routing

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Express.js + TypeScript, Socket.io, mediasoup v3 SFU, multer |
| **Frontend** | Vite + React + TypeScript, mediasoup-client, React Router |
| **Media** | Video: VP8 (max 480p, 30fps), Audio: Opus (48kHz, stereo) |
| **Recording** | WebM format (VP8/Opus), MediaRecorder API |
| **Storage** | File-based (JSON + video files) |

---

## ⚠️ Important: SSL/HTTPS is Mandatory

This application **requires HTTPS** for local development. This is not optional.

### Why?

The browser's `getUserMedia()` API (used for camera and microphone access) is restricted by most browsers to work **only over HTTPS** (or localhost in some cases). When served over HTTP:
- Camera and microphone permissions are **automatically rejected**
- The app cannot function without media access

### Solution

Use **Tailscale** to generate valid TLS certificates for local development. This enables multi-device testing with proper HTTPS support.

---

## 🔗 Tailscale Setup for Local Development

[Tailscale](https://tailscale.com/) is a mesh VPN that provides:
- **Free TLS certificates** for your devices
- **Multi-device testing** across different networks
- **Full WebRTC/UDP support** (unlike ngrok)
- **No port forwarding** required

### Quick Links

| Resource | URL |
|----------|-----|
| Tailscale Website | [https://tailscale.com/](https://tailscale.com/) |
| Getting Started Guide | [https://tailscale.com/kb/1017/install](https://tailscale.com/kb/1017/install) |
| Download | [https://tailscale.com/download](https://tailscale.com/download) |
| HTTPS Certificates Docs | [https://tailscale.com/kb/1153/enabling-https](https://tailscale.com/kb/1153/enabling-https) |

---

## 📦 Installation by Platform

### macOS

1. **Install Tailscale** from [https://tailscale.com/download](https://tailscale.com/download) or via Homebrew:
   ```bash
   brew install --cask tailscale
   ```

2. **Open Tailscale.app** and sign in with your account

3. **Add CLI alias** to your `~/.zshrc` (required for certificate generation):
   ```bash
   echo 'alias tailscale="/Applications/Tailscale.app/Contents/MacOS/Tailscale"' >> ~/.zshrc
   source ~/.zshrc
   ```

4. **Verify installation**:
   ```bash
   tailscale status
   ```

### Windows

1. **Download and install** from [https://tailscale.com/download/windows](https://tailscale.com/download/windows)

2. **Sign in** with your Tailscale account

3. **Open PowerShell** (as Administrator) and verify:
   ```powershell
   tailscale status
   ```

4. The `tailscale` CLI should be available in your PATH automatically

### Linux (Ubuntu/Debian)

1. **Install Tailscale**:
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   ```

2. **Start and authenticate**:
   ```bash
   sudo tailscale up
   ```

3. **Verify installation**:
   ```bash
   tailscale status
   ```

### Linux (Other Distributions)

See the official guide: [https://tailscale.com/kb/1031/install-linux](https://tailscale.com/kb/1031/install-linux)

---

## 🔐 Generating TLS Certificates

Once Tailscale is installed and running:

### 1. Find Your Tailscale Hostname

```bash
tailscale status
```

Your hostname format will be: `{hostname}.tail{tailId}.ts.net`

Example: `maxim.tail99fe99.ts.net`

### 2. Enable HTTPS in Tailscale Admin Console

1. Go to [Tailscale Admin Console](https://login.tailscale.com/admin/dns)
2. Enable **"HTTPS Certificates"** under DNS settings

### 3. Generate Certificates

```bash
tailscale cert your-hostname.tailXXXXXX.ts.net
```

This generates two files in your current directory:
- `your-hostname.tailXXXXXX.ts.net.crt` (certificate)
- `your-hostname.tailXXXXXX.ts.net.key` (private key)

**Example:**
```bash
tailscale cert maxim.tail99fe99.ts.net
# Creates:
#   maxim.tail99fe99.ts.net.crt
#   maxim.tail99fe99.ts.net.key
```

### 4. Store Certificates

Move the certificates to a location of your choice and note the **absolute paths**:

```bash
# Example locations (choose your own)
mkdir -p ~/certs/tailscale
mv *.crt *.key ~/certs/tailscale/

# Note the absolute paths for .env configuration:
# /Users/yourusername/certs/tailscale/your-hostname.tailXXXXXX.ts.net.crt
# /Users/yourusername/certs/tailscale/your-hostname.tailXXXXXX.ts.net.key
```

---

## ⚙️ Environment Configuration

### Prerequisites

- **Node.js** v24.11.0 or higher
- **npm** v11.6.1 or higher
- **Ports 10000-10100** must be free (used by mediasoup SFU)

> ⚠️ **Port Requirement**: The SFU uses ports 10000-10100 for WebRTC media streams. This limits the app to approximately **~50 concurrent users**. This can be increased by modifying `backend/src/mediasoup/config.ts`.

### Step 1: Copy Environment Files

```bash
# From project root
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Step 2: Configure Backend (`backend/.env`)

```bash
# Backend Environment Variables

# Your Tailscale hostname (used for WebRTC ICE candidates)
ANNOUNCED_IP=your-hostname.tailXXXXXX.ts.net

# TLS Certificate paths (MUST be absolute paths)
TLS_CERT=/absolute/path/to/your-hostname.tailXXXXXX.ts.net.crt
TLS_KEY=/absolute/path/to/your-hostname.tailXXXXXX.ts.net.key

# Allowed CORS origins (comma-separated, include your frontend URL)
ALLOWED_ORIGINS=https://your-hostname.tailXXXXXX.ts.net:3000,
PORT=3001
```

**Example:**
```bash
ANNOUNCED_IP=maxim.tail99fe99.ts.net
TLS_CERT=/Users/maxim/certs/tailscale/maxim.tail99fe99.ts.net.crt
TLS_KEY=/Users/maxim/certs/tailscale/maxim.tail99fe99.ts.net.key
ALLOWED_ORIGINS=https://maxim.tail99fe99.ts.net:3000,
PORT=3001
```

### Step 3: Configure Frontend (`frontend/.env`)

```bash
# Frontend Environment Variables

# TLS Certificate paths (MUST be absolute paths)
VITE_TLS_CERT=/absolute/path/to/your-hostname.tailXXXXXX.ts.net.crt
VITE_TLS_KEY=/absolute/path/to/your-hostname.tailXXXXXX.ts.net.key

# Your Tailscale hostname (for Vite HMR WebSocket)
VITE_SERVER_HOST=your-hostname.tailXXXXXX.ts.net
```

**Example:**
```bash
VITE_TLS_CERT=/Users/maxim/certs/tailscale/maxim.tail99fe99.ts.net.crt
VITE_TLS_KEY=/Users/maxim/certs/tailscale/maxim.tail99fe99.ts.net.key
VITE_SERVER_HOST=maxim.tail99fe99.ts.net
```

> ⚠️ **Important**: Certificate paths MUST be **absolute paths**, not relative paths.

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Start Backend Server

```bash
cd backend
npm run dev
```

The backend will start on **https://127.0.0.1:3001**

### 3. Start Frontend Server

In a new terminal:

```bash
cd frontend
npm run dev
```

The frontend will start on **https://your-hostname.tailXXXXXX.ts.net:3000**

### 4. Access the Application

Open your browser and navigate to:

```
https://your-hostname.tailXXXXXX.ts.net:3000
```

**Example:** `https://maxim.tail99fe99.ts.net:3000`

---

## 📱 Multi-Device Testing

To test the app from multiple devices (phones, tablets, other computers):

### Requirements

1. **All devices** must have Tailscale installed and running
2. **All devices** must be logged into the **same Tailscale account** (or connected to the same Tailnet)

### Steps

1. Install Tailscale on each test device:
   - **iOS**: [App Store](https://apps.apple.com/app/tailscale/id1470499037)
   - **Android**: [Play Store](https://play.google.com/store/apps/details?id=com.tailscale.ipn)
   - **Desktop**: [https://tailscale.com/download](https://tailscale.com/download)

2. Sign in with the same Tailscale account on each device

3. On each device, open a browser and navigate to:
   ```
   https://your-hostname.tailXXXXXX.ts.net:3000
   ```

4. Each device should now be able to join the same meeting!

---

## 📚 API Documentation

When the backend is running locally, API documentation is available via Swagger UI:

| Resource | URL |
|----------|-----|
| Swagger UI (Interactive) | [https://127.0.0.1:3001/api-docs](https://127.0.0.1:3001/api-docs) |
| OpenAPI Spec (JSON) | [https://127.0.0.1:3001/api-docs.json](https://127.0.0.1:3001/api-docs.json) |


---

## 🎮 Usage Guide

### 1. Register/Login
- Enter your display name on the home page
- Click "Continue" to register or retrieve your existing user ID
- Your user ID is stored in localStorage for persistence

### 2. Create a Meeting
- Click "Create New Meeting" to generate a time-sensitive meeting link
- Share the meeting URL with participants
- Meeting links expire after **24 hours**

### 3. Join a Meeting
- Enter a meeting ID or use a shared link
- Allow camera and microphone permissions
- You'll see your video and other participants' videos

### 4. In-Meeting Controls

| Button | Action |
|--------|--------|
| 🎤 | Toggle microphone on/off |
| 📹 | Toggle camera on/off |
| ⏺ | Start recording |
| ⏹ | Stop recording & upload |
| 🔗 | Copy meeting link |
| 🚪 | Leave meeting |

### 5. View Recordings
- Click "View My Recordings" from home page
- **Play**: Watch a recording
- **Rename**: Change the recording title
- **Delete**: Remove a recording (async deletion)

---

## ⚙️ Configuration Reference

### mediasoup Port Range

The SFU uses UDP/TCP ports for media streams:

```typescript
// backend/src/mediasoup/config.ts
worker: {
  rtcMinPort: 10000,
  rtcMaxPort: 10100,  // ~100 ports = ~50 users
}
```

To support more users, increase `rtcMaxPort`:
- 200 ports → ~100 users
- 500 ports → ~250 users


### Server Ports

| Service | Port | Protocol |
|---------|------|----------|
| Frontend (Vite) | 3000 | HTTPS |
| Backend (Express) | 3001 | HTTPS |
| WebRTC Media | 10000-10100 | UDP/TCP |

---

## 🔧 Troubleshooting

### Tailscale Issues

#### "tailscale: command not found" (macOS)

Ensure you've added the alias to your shell if you installed the app normally:
```bash
echo 'alias tailscale="/Applications/Tailscale.app/Contents/MacOS/Tailscale"' >> ~/.zshrc
source ~/.zshrc
```

#### Certificate generation fails

1. Ensure HTTPS is enabled in [Tailscale Admin Console](https://login.tailscale.com/admin/dns)
2. Wait a few minutes after enabling for DNS propagation
3. Try again: `tailscale cert your-hostname.tailXXXXXX.ts.net`

### SSL/Certificate Issues

#### "NET::ERR_CERT_AUTHORITY_INVALID"

- Ensure you're using the correct Tailscale hostname in the URL
- Verify certificate files exist at the paths specified in `.env`
- Check that paths are **absolute**, not relative

#### Backend starts in HTTP mode

Check the backend logs. If you see:
```
[Server] No TLS certificates found, running in HTTP mode
```

Verify:
1. `TLS_CERT` and `TLS_KEY` paths in `backend/.env` are correct
2. Files exist at those paths
3. Paths are absolute (start with `/`)

### Camera/Microphone Issues

#### Permissions automatically denied

- Ensure you're accessing via **HTTPS**, not HTTP
- Use your Tailscale hostname, not `localhost` or IP address
- Check browser console for specific error messages

#### No camera/mic available

1. Check device permissions in System Preferences/Settings
2. Ensure no other app is using the camera
3. Try a different browser

### WebRTC Connection Issues

#### Video calls not connecting between devices

1. Verify all devices are on the same Tailscale network:
   ```bash
   tailscale status
   ```

2. Check `ANNOUNCED_IP` in `backend/.env` matches your Tailscale hostname

3. Ensure ports 10000-10100 are not blocked by firewall.

### Common Errors

#### "Meeting link has expired"

Meeting links expire after 24 hours. Create a new meeting.

---

## 🚀 Production Deployment

For production deployment to a server, see [DEPLOYMENT.md](./DEPLOYMENT.md).

Key differences from local development:
- Uses Caddy as reverse proxy with automatic TLS
- Docker containers for backend
- Frontend served as static files
- Backend bound to localhost only (accessed via reverse proxy)

---

## ⚖️ Trade-offs & Limitations

### ✅ Pros
- Quick setup for local development
- No database required (file-based storage)
- Client-side recording reduces server load
- Full TypeScript support
- Multi-device testing with Tailscale

### ⚠️ Limitations
- File-based storage not suitable for production scale
- No real authentication (pseudo-auth only)
- Meeting links expire after 24 hours
- ~50 user limit (configurable)
- Each user records only their view
- No server-side recording
- localStorage can be cleared

---

## 🔮 Future Enhancements

- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] Real authentication (JWT, OAuth)
- [ ] Server-side recording
- [ ] Screen sharing
- [ ] Chat functionality
- [ ] Meeting scheduling
- [ ] Recording transcription
- [ ] Cloud storage (S3)
- [ ] Horizontal scaling
- [ ] End-to-end encryption
- [ ] Mobile responsive design

---


## 🙏 Credits

Built with:
- [mediasoup](https://mediasoup.org/) - WebRTC SFU
- [React](https://react.dev/) - UI framework
- [Vite](https://vitejs.dev/) - Build tool
- [Socket.io](https://socket.io/) - WebSocket library
- [Express](https://expressjs.com/) - Web framework
- [Tailscale](https://tailscale.com/) - Mesh VPN for local HTTPS

