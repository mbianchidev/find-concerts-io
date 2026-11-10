import { AppError } from './errors';

export const APP_USER_AGENT =
  'FindConcertsIO/1.0 (+https://github.com/mbianchidev/find-concerts-io)';

export async function readLimitedBody(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
  error: AppError
): Promise<Buffer> {
  const reader = body?.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  if (!reader) return Buffer.alloc(0);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) {
        await reader.cancel();
        throw error;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
