import { firebaseAdminAuth } from '@/lib/firebase-admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';

export async function requireWorkspaceUser(request: NextRequest) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new Error('AUTH_REQUIRED');
  const decoded = await firebaseAdminAuth().verifyIdToken(token, true);
  if (!decoded.email || !decoded.email_verified) throw new Error('EMAIL_UNVERIFIED');
  const supabase = getSupabaseAdmin();
  const { data: profile, error } = await supabase.from('profiles').select('*').eq('firebase_uid', decoded.uid).maybeSingle();
  if (error) throw error;
  if (!profile) throw new Error('PROFILE_NOT_FOUND');
  if (profile.approval_status !== 'approved') throw new Error('ACCESS_NOT_APPROVED');
  return { decoded, profile, supabase };
}

export function authError(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  const status = code === 'AUTH_REQUIRED' || code === 'EMAIL_UNVERIFIED' ? 401 : code === 'ACCESS_NOT_APPROVED' ? 403 : 500;
  return NextResponse.json({ error: status === 500 ? 'Workspace service is temporarily unavailable.' : code.replaceAll('_', ' ').toLowerCase() }, { status });
}

export function requireAdminSession(request: NextRequest, uid: string) {
  const raw = request.cookies.get('workspace_admin')?.value || '';
  const [payload, signature] = raw.split('.');
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!payload || !signature || !secret) return false;
  const expected = createHmac('sha256', secret).update(payload).digest();
  let actual: Buffer; try { actual = Buffer.from(signature, 'base64url'); } catch { return false; }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
  try { const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); return data.uid === uid && Number(data.exp) > Date.now(); } catch { return false; }
}
