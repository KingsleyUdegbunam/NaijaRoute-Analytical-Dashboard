import { onBeforeUnmount } from 'vue';
import { useDashboardStore } from '../stores/dashboard';
import { StreamSimulator } from '../services/streamSimulator';
import type { StreamPayload } from '../types/telemetry';

export function useStream() {
  const store = useDashboardStore();
  const stream = new StreamSimulator();
  let frameId = 0;
  let queue: StreamPayload[] = [];

  const flush = () => {
    frameId = 0;
    const payloads = queue;
    queue = [];
    if (payloads.length > 8) store.noteDroppedFrame();
    store.ingestBatch(payloads.slice(-8));
  };

  const offPayload = stream.on<StreamPayload>('payload', (payload) => {
    queue.push(payload);
    if (!frameId) frameId = window.requestAnimationFrame(flush);
  });
  const offStatus = stream.on('status', store.setStatus);
  const offMalformed = stream.on('malformed', store.markMalformed);

  stream.start();

  onBeforeUnmount(() => {
    stream.stop();
    offPayload();
    offStatus();
    offMalformed();
    if (frameId) window.cancelAnimationFrame(frameId);
  });
}
