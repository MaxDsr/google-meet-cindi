# Cindy WebRTC - Engineering Tradeoffs

This document captures the architectural decisions, known limitations, and potential improvements for the Cindy WebRTC video conferencing application. Each section outlines the approach taken, its benefits, and areas where a production system would require additional investment.

---

## Table of Contents

1. [Video Recording](#video-recording)
2. [Video Resolution](#video-resolution)
3. [Authentication](#authentication)
4. [Backend Security](#backend-security)
5. [Data Storage](#data-storage)
6. [Frontend UX](#frontend-ux)
7. [Conclusion](#conclusion)

---

## Video Meeting

### Pros

 - MVP with WebRTC where the data is being transported via the mediasoup SFU server
 - Forward participants streams without duplicating them, no peer-to-peer approach since it is not scalable

### Cons

 - Higher load on the BE container since it handles both CRUD operations & the SFU
 - Scaling is not yet handled. Poor support for big number of users at the same time

## Video Recording

This is the most significant architectural decision in the project.

### Ideal Solution (Not Implemented)

A production-grade recording system would handle recordings on the **server side**:

1. **Track Interception**: Intercept and store all audio/video tracks separately via `ffmpeg`
2. **Async Composition**: Build the final recording asynchronously after the meeting ends
3. **Grid Layout**: Compose a layout with all participants' video and audio using `ffmpeg` or similar tools
4. **Distributed Architecture**: Run the ffmpeg service in a separate Docker container, ready to scale horizontally
5. **Load Balancing**: Implement a distributed system with load balancing to handle high concurrent usage

This approach was not implemented due to time constraints and complexity.

### Alternative Approaches Considered

| Approach | Description | Why Not Chosen |
|----------|-------------|----------------|
| **Ghost User** | Programmatically inject a "ghost" user into each room when recording starts. This user records what they see/hear using automation tools (Puppeteer/Playwright) | Still requires `ffmpeg` for audio capture since audio output may not be accessible from automation tools |
| **Client-Side Canvas** | Use browser MediaRecorder API with a `<canvas>` element to compose the video layout, combined with audio track mixing |  |

### Implemented Solution

Client-side recording using:
- **MediaRecorder API** for capturing the composed stream
- **Canvas-based layout** for rendering participant video feeds
- **Audio track mixing** via Web Audio API

### Pros

| Benefit | Description |
|---------|-------------|
| Sufficient Performance | Modern devices (including phones) handle small-to-medium duration meetings well |
| No Server Load | Recording computation is offloaded to client devices |
| Immediate Availability | Recordings are available instantly without server-side processing |
| Simpler Architecture | No need for distributed ffmpeg infrastructure |

### Cons

| Limitation | Description |
|------------|-------------|
| Participant Limit | Layout breaks with 5+ participants due to canvas size constraints or video track resolution downsizing |
| Late Joiners Excluded | Users joining after recording starts are not captured in the ongoing recording |
| No Rate Limiting | Each user can record unlimited content until backend storage is exhausted |
| Device Dependent | Recording quality depends on client device capabilities |

---

## Video Resolution

### Decision

Fixed **480p (854×480)** resolution for all video streams, regardless of device capability.

### Pros

| Benefit | Description |
|---------|-------------|
| Uniform Standard | Consistent video quality across all participants |
| Bandwidth Efficiency | Lower resolution reduces network requirements |
| Laptop Compatibility | Works well with standard 16:9 laptop webcams |

### Cons

| Limitation | Description |
|------------|-------------|
| Mobile Aspect Ratio | Video appears shrunk on mobile devices due to different aspect ratios |
| Portrait Mode Issues | Particularly problematic when mobile users hold their phone in portrait orientation |
| Underutilization | Devices capable of higher resolution are artificially limited |

---

## Authentication

### Approach

Pseudo-authentication using **localStorage** to persist usernames.

### Pros

| Benefit | Description |
|---------|-------------|
| Simplicity | No complex auth infrastructure required |
| Cross-Device Access | Users can access their recordings from any device by entering the same username |
| Fast Development | Enabled rapid prototyping without auth overhead |

### Cons

| Limitation | Description |
|------------|-------------|
| No Real Security | Anyone who knows (or guesses) a username can access that user's recordings |
| No Password Protection | Usernames alone provide no authentication barrier |
| Session Hijacking | Trivial to impersonate any user |

---

## Backend Security

### Current State

- CORS configured to accept requests **only from the frontend origin**

### Limitations

| Vulnerability | Description |
|---------------|-------------|
| Unprotected Endpoints | API endpoints have no authentication or authorization |
| Cross-User Access | Knowing another user's username allows viewing, editing, renaming, and deleting their recordings |
| No Input Validation | Limited protection against malicious payloads |
| No Rate Limiting | APIs vulnerable to abuse and DoS attacks |

### Production Requirements

A production system would need:
- JWT or session-based authentication
- Role-based access control (RBAC)
- Input validation and sanitization
- Rate limiting on all endpoints
- Request signing for sensitive operations

---

## Data Storage

### Approach

**File-based storage** using JSON files for metadata and raw files for video recordings.

### Pros

| Benefit | Description |
|---------|-------------|
| Quick Setup | No database configuration or management required |
| Easy Debugging | JSON files are human-readable and easy to inspect |
| MVP Friendly | Perfect for rapid prototyping and proof-of-concept |
| No Dependencies | No external database service needed |

### Cons

| Limitation | Description |
|------------|-------------|
| Scalability | Files become unwieldy as data volume grows |
| Concurrent Access | No built-in locking or transaction support |
| Query Performance | No indexing; searches require full file scans |
| Data Integrity | No ACID guarantees; risk of corruption on crashes |

### Production Requirements

A production system would use:
- PostgreSQL or MongoDB for structured data
- Object storage (S3, GCS) for video files
- Proper backup and recovery procedures

---

## Frontend UX

### Pros

| Benefit | Description |
|---------|-------------|
| Rapid Prototyping | Quick iteration on features and UI |
| Modern Stack | Vite + React provides excellent DX |
| Responsive Design | Basic mobile compatibility |

### Known Issues

| Issue | Description |
|-------|-------------|
| Deep Link Redirect | Pasting a meeting link while logged out doesn't redirect to the meeting after login |
| State Management | Limited global state handling |
| Error Handling | Basic error feedback to users |

---

## Conclusion

This project serves as a **solid proof of concept** demonstrating how to manage and manipulate RTP audio/video streams using WebRTC and mediasoup.

While there is significant room for improvement in each area documented above, the current implementation successfully demonstrates:

- Real-time video/audio communication via SFU architecture
- Client-side recording with multi-participant layout
- Basic user and recording management
- Meeting link sharing with time-based expiry

The tradeoffs made prioritize **development speed** and **proof-of-concept clarity** over production readiness. Each limitation documented here represents a clear path forward for productionizing the application.

