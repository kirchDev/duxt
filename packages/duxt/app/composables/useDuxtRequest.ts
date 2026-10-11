import { onScopeDispose, ref } from 'vue';

export interface DuxtRequestResult {
  status: number;
  statusText: string;
  duration: number;
  headers: [string, string][];
  body: string;
  truncated: boolean;
}

export type DuxtRequestFailure = 'cancelled' | 'timeout' | 'blocked';

/** A direct, ephemeral browser request with a bounded response preview. */
export function useDuxtRequest({
  timeout = 30_000,
  maxBytes = 1024 * 1024,
  minimumWait = 300,
  settled
}: {
  timeout?: number;
  maxBytes?: number;
  minimumWait?: number;
  settled?: (
    outcome: 'response' | 'failed',
    duration: number,
    status?: number
  ) => void;
} = {}) {
  const sending = ref(false);
  const result = ref<DuxtRequestResult>();
  const failure = ref<DuxtRequestFailure>();
  let active: AbortController | undefined;
  let disposed = false;

  const cancel = () =>
    active?.abort(new DOMException('Cancelled', 'AbortError'));
  onScopeDispose(() => {
    disposed = true;
    cancel();
  });

  async function send(url: string, init: RequestInit) {
    if (sending.value || disposed) return;
    const controller = new AbortController();
    active = controller;
    sending.value = true;
    const started = performance.now();
    const timer = setTimeout(
      () => controller.abort(new DOMException('Timed out', 'TimeoutError')),
      timeout
    );
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      const preview = await readPreview(response, maxBytes, controller.signal);
      const duration = Math.round(performance.now() - started);
      if (disposed) return;
      result.value = {
        status: response.status,
        statusText: response.statusText,
        duration,
        headers: [...response.headers.entries()],
        ...preview,
        body: preview.truncated
          ? preview.body
          : formatPreview(preview.body, maxBytes)
      };
      failure.value = undefined;
      settled?.('response', duration, response.status);
    } catch {
      if (disposed) return;
      result.value = undefined;
      failure.value = controller.signal.aborted
        ? controller.signal.reason?.name === 'TimeoutError'
          ? 'timeout'
          : 'cancelled'
        : 'blocked';
      settled?.('failed', Math.round(performance.now() - started));
    } finally {
      clearTimeout(timer);
      const remaining = minimumWait - (performance.now() - started);
      if (!disposed && remaining > 0)
        await new Promise((resolve) => setTimeout(resolve, remaining));
      if (active === controller) {
        active = undefined;
        sending.value = false;
      }
    }
  }
  return { sending, result, failure, send, cancel };
}

function formatPreview(text: string, maxBytes: number): string {
  // Indenting nested JSON can expand a few KiB into tens of MiB. Bound both
  // formatting work and its output, not just the incoming response stream.
  if (text.length > 64 * 1024) return text;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (const character of text) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quoted && character === '\\') {
      escaped = true;
      continue;
    }
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (quoted) continue;
    if (character === '{' || character === '[') {
      if (++depth > 32) return text;
    } else if (character === '}' || character === ']') depth--;
  }
  try {
    const formatted = JSON.stringify(JSON.parse(text), null, 2);
    return new TextEncoder().encode(formatted).byteLength <= maxBytes
      ? formatted
      : text;
  } catch {
    return text;
  }
}

async function readPreview(
  response: Response,
  maxBytes: number,
  signal: AbortSignal
) {
  if (!response.body) return { body: '', truncated: false };
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parts: string[] = [];
  let bytes = 0;
  // Also cancels a stalled body after the headers have arrived.
  const abort = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
  try {
    while (true) {
      signal.throwIfAborted();
      const chunk = await reader.read();
      signal.throwIfAborted();
      if (chunk.done) break;
      const remaining = maxBytes - bytes;
      parts.push(
        decoder.decode(chunk.value.subarray(0, remaining), { stream: true })
      );
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        parts.push(decoder.decode());
        return { body: parts.join(''), truncated: true };
      }
    }
    parts.push(decoder.decode());
    return { body: parts.join(''), truncated: false };
  } finally {
    signal.removeEventListener('abort', abort);
    reader.releaseLock();
  }
}
