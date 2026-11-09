export async function onRequestError(error: unknown) {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const [{ reportUnexpectedError }, { randomUUID }] = await Promise.all([
      import('@/server/logger'),
      import('node:crypto'),
    ]);
    await reportUnexpectedError(error, randomUUID());
  }
}
