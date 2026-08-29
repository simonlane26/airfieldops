import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Edge middleware: two baseline protections that were previously absent.
 *
 *  1. IP rate limiting on authentication endpoints (AO-02). Stops unlimited
 *     online password guessing / credential stuffing.
 *  2. Cross-origin check on state-changing API requests (AO-10, defence in depth
 *     for AO-02). Rejects mutations whose Origin is a different site.
 *
 * The rate-limit store is an in-process Map. That is correct for a single
 * instance; on multi-instance / multi-region hosting each instance keeps its own
 * counters, so move to a shared store (e.g. @upstash/ratelimit + Upstash Redis)
 * using the same `${ip}:${path}` key scheme before relying on it at scale.
 */

const HOUR_MS = 60 * 60 * 1000;

// Requests allowed per client IP per rolling hour, keyed by exact pathname.
// `/auth/register` and `/auth/signup` are pre-wired at the requested 5/hour even
// though those routes do not exist yet — the cap activates automatically when
// self-service registration is added.
const RATE_LIMITS: Record<string, number> = {
  '/api/auth/callback/credentials': 10,
  '/auth/register': 5,
  '/auth/signup': 5,
};

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientIp(req: NextRequest): string {
  // On Vercel / Cloudflare the edge overwrites x-forwarded-for with the real
  // client IP as the left-most entry. If this app is ever served by a directly
  // exposed Node server, this header is client-controlled and must not be trusted.
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip')?.trim() || '0.0.0.0';
}

function rateLimited(req: NextRequest, pathname: string): boolean {
  const limit = RATE_LIMITS[pathname];
  if (!limit) return false;

  const key = `${clientIp(req)}:${pathname}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + HOUR_MS });
    return false;
  }

  bucket.count += 1;
  if (bucket.count > limit) return true;

  // Opportunistic cleanup so the Map cannot grow unbounded.
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
  }
  return false;
}

function crossOriginMutation(req: NextRequest): boolean {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return false;

  const origin = req.headers.get('origin');
  if (!origin) return false; // no Origin header → not a browser cross-site fetch

  try {
    return new URL(origin).host !== req.headers.get('host');
  } catch {
    return true; // unparseable Origin → reject
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/') && crossOriginMutation(req)) {
    return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 });
  }

  if (rateLimited(req, pathname)) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      { status: 429, headers: { 'Retry-After': '3600' } }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/auth/:path*'],
};
