import { handleApi } from '@/server/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const handler = (request: Request) => handleApi(request);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
