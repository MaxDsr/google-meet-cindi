import fs from 'fs';
import { deleteRecording, findRecordingById, getRecordingFilePath } from './fileStorage';

interface DeletionTask {
  recordingId: string;
  scheduledAt: number;
}

class DeletionQueue {
  private queue: DeletionTask[] = [];
  private processing = false;
  private interval: NodeJS.Timeout | null = null;

  /**
   * Add a recording to the deletion queue
   */
  enqueue(recordingId: string): void {
    this.queue.push({
      recordingId,
      scheduledAt: Date.now(),
    });
    console.log(`[DeletionQueue] Enqueued recording: ${recordingId}`);
  }

  /**
   * Start processing the queue every 10 seconds
   */
  start(): void {
    if (this.interval) {
      return; // Already started
    }

    console.log('[DeletionQueue] Starting deletion queue processor...');
    
    // Process immediately
    this.processQueue();
    
    // Then process every 10 seconds
    this.interval = setInterval(() => {
      this.processQueue();
    }, 10000);
  }

  /**
   * Stop the queue processor
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('[DeletionQueue] Stopped deletion queue processor');
    }
  }

  /**
   * Process all items in the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    console.log(`[DeletionQueue] Processing ${this.queue.length} deletion(s)...`);

    const tasksToProcess = [...this.queue];
    this.queue = [];

    for (const task of tasksToProcess) {
      await this.deleteRecordingFiles(task.recordingId);
    }

    this.processing = false;
  }

  /**
   * Delete recording file and metadata
   */
  private async deleteRecordingFiles(recordingId: string): Promise<void> {
    try {
      // Find recording metadata
      const recording = findRecordingById(recordingId);
      
      if (!recording) {
        console.log(`[DeletionQueue] Recording ${recordingId} not found in metadata`);
        return;
      }

      // Delete video file from filesystem
      const filePath = getRecordingFilePath(recording.filename);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[DeletionQueue] Deleted file: ${filePath}`);
      } else {
        console.log(`[DeletionQueue] File not found: ${filePath}`);
      }

      // Remove from metadata
      const deleted = deleteRecording(recordingId);
      
      if (deleted) {
        console.log(`[DeletionQueue] Deleted metadata for: ${recordingId}`);
      }
      
      console.log(`[DeletionQueue] Successfully deleted recording: ${recordingId}`);
    } catch (error) {
      console.error(`[DeletionQueue] Error deleting recording ${recordingId}:`, error);
      // Re-queue on error for retry
      this.queue.push({
        recordingId,
        scheduledAt: Date.now(),
      });
    }
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }
}

// Export singleton instance
export const deletionQueue = new DeletionQueue();

