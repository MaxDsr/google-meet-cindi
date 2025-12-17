import * as mediasoup from 'mediasoup';
import { Worker } from 'mediasoup/node/lib/types';
import { config } from './config';

let worker: Worker;

/**
 * Create mediasoup worker
 */
export async function createWorker(): Promise<Worker> {
  worker = await mediasoup.createWorker({
    logLevel: config.worker.logLevel,
    logTags: config.worker.logTags,
    rtcMinPort: config.worker.rtcMinPort,
    rtcMaxPort: config.worker.rtcMaxPort,
  });

  console.log(`[Worker] Created worker with PID: ${worker.pid}`);

  worker.on('died', () => {
    console.error('[Worker] Worker died, exiting in 2 seconds...');
    setTimeout(() => process.exit(1), 2000);
  });

  return worker;
}

/**
 * Get the current worker instance
 */
export function getWorker(): Worker {
  return worker;
}

