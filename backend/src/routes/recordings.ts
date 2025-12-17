import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  addRecording,
  findRecordingById,
  updateRecording,
  getRecordingsByUserId,
  getRecordingFilePath,
  Recording,
  RecordingType,
} from '../storage/fileStorage';
import { deletionQueue } from '../storage/deletionQueue';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../data/recordings'));
  },
  filename: (req, file, cb) => {
    const userId = req.body.userId;
    const recId = randomUUID();
    const timestamp = Date.now();
    const filename = `${userId}-rec-${recId}-${timestamp}.webm`;
    cb(null, filename);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
});

/**
 * @swagger
 * /api/recordings:
 *   post:
 *     summary: Upload a new recording
 *     description: Upload a recording file with associated metadata
 *     tags: [Recordings]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - userId
 *               - meetingId
 *               - username
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Recording file (webm format, max 500MB)
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID of the uploader
 *               meetingId:
 *                 type: string
 *                 description: Associated meeting ID
 *               username:
 *                 type: string
 *                 description: Username of the uploader
 *               title:
 *                 type: string
 *                 description: Recording title (optional)
 *               duration:
 *                 type: number
 *                 description: Duration in milliseconds
 *               recordingType:
 *                 type: string
 *                 enum: [audio, video, both]
 *                 description: Type of recording
 *     responses:
 *       200:
 *         description: Recording uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recordingId:
 *                   type: string
 *                   description: Unique recording identifier
 *                 message:
 *                   type: string
 *                   example: Recording uploaded successfully
 *       400:
 *         description: Missing file or required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', upload.single('file'), (req, res) => {
  try {
    const { userId, meetingId, username, title, duration, recordingType } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!userId || !meetingId || !username) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate recording type
    const validRecordingTypes: RecordingType[] = ['audio', 'video', 'both'];
    const type: RecordingType = validRecordingTypes.includes(recordingType) ? recordingType : 'both';

    const recording: Recording = {
      recordingId: path.parse(file.filename).name,
      userId,
      meetingId,
      username,
      title: title || `Recording - ${new Date().toLocaleString()}`,
      filename: file.filename,
      duration: parseInt(duration) || 0,
      createdAt: Date.now(),
      recordingType: type,
    };

    addRecording(recording);
    console.log(`[Recordings] Added recording: ${recording.recordingId} (type: ${type})`);

    return res.json({
      recordingId: recording.recordingId,
      message: 'Recording uploaded successfully',
    });
  } catch (error) {
    console.error('[Recordings] Error uploading recording:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/recordings:
 *   get:
 *     summary: List recordings
 *     description: Get all recordings for a specific user
 *     tags: [Recordings]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID to filter recordings
 *     responses:
 *       200:
 *         description: List of recordings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recordings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Recording'
 *       400:
 *         description: userId query parameter is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const recordings = getRecordingsByUserId(userId as string);
    return res.json({ recordings });
  } catch (error) {
    console.error('[Recordings] Error getting recordings:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/recordings/{id}:
 *   get:
 *     summary: Get a specific recording
 *     description: Get recording metadata by ID
 *     tags: [Recordings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Recording ID
 *     responses:
 *       200:
 *         description: Recording details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recording:
 *                   $ref: '#/components/schemas/Recording'
 *                 videoUrl:
 *                   type: string
 *                   description: URL to stream the video
 *                   example: /api/recordings/abc123/video
 *       404:
 *         description: Recording not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const recording = findRecordingById(id);

    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    return res.json({
      recording,
      videoUrl: `/api/recordings/${id}/video`,
    });
  } catch (error) {
    console.error('[Recordings] Error getting recording:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/recordings/{id}/video:
 *   get:
 *     summary: Stream recording video
 *     description: Stream the video file for a recording
 *     tags: [Recordings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Recording ID
 *     responses:
 *       200:
 *         description: Video file stream
 *         content:
 *           video/webm:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Recording not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/video', (req, res) => {
  try {
    const { id } = req.params;
    const recording = findRecordingById(id);

    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    const filePath = getRecordingFilePath(recording.filename);
    return res.sendFile(filePath);
  } catch (error) {
    console.error('[Recordings] Error streaming video:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/recordings/{id}:
 *   put:
 *     summary: Update recording
 *     description: Update recording metadata (e.g., rename)
 *     tags: [Recordings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Recording ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 description: New title for the recording
 *                 example: Updated Meeting Title
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID for ownership verification
 *     responses:
 *       200:
 *         description: Recording updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Recording updated
 *       400:
 *         description: Title is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Not authorized to update this recording
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Recording not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, userId } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const recording = findRecordingById(id);
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    // Verify ownership
    if (userId && recording.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this recording' });
    }

    const success = updateRecording(id, { title });

    if (success) {
      console.log(`[Recordings] Updated recording: ${id}`);
      return res.json({ success: true, message: 'Recording updated' });
    } else {
      return res.status(500).json({ error: 'Failed to update recording' });
    }
  } catch (error) {
    console.error('[Recordings] Error updating recording:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/recordings/{id}:
 *   delete:
 *     summary: Delete recording
 *     description: Queue a recording for async deletion
 *     tags: [Recordings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Recording ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID for ownership verification
 *     responses:
 *       200:
 *         description: Recording queued for deletion
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Deleted successfully!
 *       403:
 *         description: Not authorized to delete this recording
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Recording not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    const recording = findRecordingById(id);
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    // Verify ownership
    if (userId && recording.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this recording' });
    }

    // Add to deletion queue (async deletion)
    deletionQueue.enqueue(id);
    
    console.log(`[Recordings] Queued deletion for recording: ${id}`);

    // Respond immediately
    return res.json({ message: 'Deleted successfully!' });
  } catch (error) {
    console.error('[Recordings] Error deleting recording:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
