/**
 * Tests for /api/debate route — Story 2.5 Task 5
 *
 * Tests cover: authentication, request validation, and streaming response.
 * Run with: npx vitest run app/api/debate/__tests__/route.test.ts
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock child_process before importing the route
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

vi.mock('node:path', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:path')>();
  return { ...actual, join: (...args: string[]) => args.join('/') };
});

import { spawn } from 'node:child_process';
import { POST } from '../route';

// Helpers
function makeRequest(body: unknown, authHeader?: string): NextRequest {
  return new NextRequest('http://localhost/api/debate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify(body),
  });
}

/** Creates a base64url-encoded JWT payload (not signed, only for unit tests). */
function makeJwt(payload: Record<string, unknown>): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${encoded}.signature`;
}

describe('/api/debate — authentication', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const req = makeRequest({ topic: 't', minds: ['m'], user_message: 'hi' });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json() as { code: string };
    expect(json.code).toBe('AUTH_REQUIRED');
  });

  it('returns 401 when Authorization header is not Bearer', async () => {
    const req = makeRequest(
      { topic: 't', minds: ['m'], user_message: 'hi' },
      'Basic dXNlcjpwYXNz',
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when JWT has no sub claim', async () => {
    const jwt = makeJwt({ email: 'user@example.com' });
    const req = makeRequest(
      { topic: 't', minds: ['m'], user_message: 'hi' },
      `Bearer ${jwt}`,
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

describe('/api/debate — request validation', () => {
  const validJwt = makeJwt({ sub: 'user-123' });
  const auth = `Bearer ${validJwt}`;

  it('returns 400 when topic is missing', async () => {
    const req = makeRequest({ minds: ['paul_graham'], user_message: 'hi' }, auth);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json() as { code: string };
    expect(json.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when minds array is empty', async () => {
    const req = makeRequest({ topic: 'startups', minds: [], user_message: 'hi' }, auth);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when user_message is missing', async () => {
    const req = makeRequest({ topic: 'startups', minds: ['paul_graham'] }, auth);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('/api/debate — happy path', () => {
  const validJwt = makeJwt({ sub: 'user-abc' });
  const auth = `Bearer ${validJwt}`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('spawns python subprocess and returns streaming response', async () => {
    const { EventEmitter } = await import('node:events');

    const mockStdout = new EventEmitter();
    const mockStderr = new EventEmitter();
    const mockProc = new EventEmitter() as NodeJS.EventEmitter & {
      stdout: typeof mockStdout;
      stderr: typeof mockStderr;
    };
    mockProc.stdout = mockStdout;
    mockProc.stderr = mockStderr;

    vi.mocked(spawn).mockReturnValue(mockProc as ReturnType<typeof spawn>);

    const req = makeRequest(
      { topic: 'AI startups', minds: ['paul_graham'], user_message: 'What do you think?' },
      auth,
    );

    const responsePromise = POST(req);

    // Simulate python output
    setTimeout(() => {
      mockStdout.emit(
        'data',
        Buffer.from(
          JSON.stringify({ type: 'text', mind_slug: 'paul_graham', content: 'Hello' }) + '\n',
        ),
      );
      setTimeout(() => {
        mockStdout.emit(
          'data',
          Buffer.from(JSON.stringify({ type: 'done', mind_slug: '' }) + '\n'),
        );
        mockProc.emit('close', 0);
      }, 10);
    }, 10);

    const res = await responsePromise;
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/x-ndjson');
    expect(vi.mocked(spawn)).toHaveBeenCalledOnce();
  });
});
