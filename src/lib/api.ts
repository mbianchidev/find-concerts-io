'use client';

import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import type { PageResult } from '@/types';
import { venueFacetSchema } from './schema';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function apiUrl(path: string): string {
  const index = path.indexOf('?');
  const resource = index < 0 ? path : path.slice(0, index);
  const query = index < 0 ? '' : path.slice(index);
  return `${BASE_PATH}/api/v1${resource.endsWith('/') ? resource : `${resource}/`}${query}`;
}

async function request(path: string, options?: RequestInit): Promise<unknown> {
  let response;
  try {
    response = await fetch(apiUrl(path), {
      ...options,
      credentials: 'same-origin',
      headers: {
        ...(options?.body && !(options.body instanceof FormData)
          ? { 'content-type': 'application/json' }
          : {}),
        ...options?.headers,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    console.error('Concert API network request failed', {
      path: path.split('?')[0],
    });
    throw new ApiError(
      'The app could not reach the server. Check your connection and try again.',
      0,
      'NETWORK_ERROR'
    );
  }
  const payload: unknown = await response.json();
  if (!response.ok) {
    const parsed = z
      .object({
        error: z.object({
          message: z.string(),
          code: z.string(),
          request_id: z.string().optional(),
        }),
      })
      .safeParse(payload);
    const message = parsed.success
      ? parsed.data.error.message
      : `The request failed (HTTP ${response.status}).`;
    console.error('Concert API request rejected', {
      status: response.status,
      code: parsed.success ? parsed.data.error.code : 'UNKNOWN_ERROR',
    });
    throw new ApiError(
      message,
      response.status,
      parsed.success ? parsed.data.error.code : 'UNKNOWN_ERROR'
    );
  }
  return payload;
}

export async function apiData<T>(
  path: string,
  schema: z.ZodType<T>,
  options?: RequestInit
): Promise<T> {
  return z.object({ data: schema }).parse(await request(path, options)).data;
}

export async function apiPage<T>(
  path: string,
  schema: z.ZodType<T>,
  options?: RequestInit
): Promise<PageResult<T>> {
  return z
    .object({
      data: z.array(schema),
      meta: z.object({
        total: z.number(),
        page: z.number(),
        limit: z.number(),
        has_next: z.boolean(),
        venues: z.array(venueFacetSchema).optional(),
      }),
    })
    .parse(await request(path, options));
}

export function useApiPage<T>(
  path: string,
  schema: z.ZodType<T>,
  scope = 'public',
  enabled = true
) {
  return useQuery({
    queryKey: ['page', scope, path],
    queryFn: ({ signal }) => apiPage(path, schema, { signal }),
    enabled,
  });
}

export function useApiData<T>(
  path: string,
  schema: z.ZodType<T>,
  scope = 'public',
  enabled = true
) {
  return useQuery({
    queryKey: ['data', scope, path],
    queryFn: ({ signal }) => apiData(path, schema, { signal }),
    enabled,
  });
}
