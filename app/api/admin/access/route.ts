import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { requireWorkspaceUser } from '@/lib/workspace-auth';

export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  try {
    const { profile, decoded } = await requireWorkspaceUser(request);
    if (profile.email.toLowerCase() !== 'whyzephyxx@gmail.com' || profile.role !== 'founder_admin') {
      return NextResponse.json({ error: 'Administrator identity required.' }, { status: 403 });
    }
    const body = await request.json();
    const stage = body.stage === 'pin' ? 'pin' : 'phrase';
    const expected = stage === 'pin' ? process.env.WORKSPACE_ADMIN_PIN : process.env.WORKSPACE_ADMIN_SEARCH_CODE;
    const supplied = typeof body.value === 'string' ? body.value : '';
    if (!expected || !supplied || supplied.length !== expected.length) return NextResponse.json({ error: 'Invalid access details.' }, { status: 401 });
    const a = Buffer.from(supplied), b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: 'Invalid access details.' }, { status: 401 });
    if (stage === 'phrase') return NextResponse.json({ ok: true, next: 'pin' });
    const secret = process.env.ADMIN_SESSION_SECRET || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!secret) return NextResponse.json({ error: 'Admin session configuration is unavailable.' }, { status: 503 });
    const expires = Date.now() + 30 * 60 * 1000;
    const payload = Buffer.from(JSON.stringify({ uid: decoded.uid, exp: expires })).toString('base64url');
    const signature = createHmac('sha256', secret).update(payload).digest('base64url');
    const response = NextResponse.json({ ok: true, redirect: '/dashboard?view=admin' });
    response.cookies.set('workspace_admin', payload + '.' + signature, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 1800 });
    return response;
  } catch { return NextResponse.json({ error: 'Administrator verification failed.' }, { status: 401 }); }
}
