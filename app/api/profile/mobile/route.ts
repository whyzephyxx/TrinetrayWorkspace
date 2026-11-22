import { NextResponse } from 'next/server';
import { firebaseAdminAuth } from '@/lib/firebase-admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

async function verifiedUser(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) throw new Error('AUTH_REQUIRED');
  const user = await firebaseAdminAuth().verifyIdToken(token, true);
  if (!user.email || !user.email_verified) throw new Error('EMAIL_NOT_VERIFIED');
  return user;
}

export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const { data, error } = await getSupabaseAdmin()
      .from('profiles').select('mobile_number').eq('firebase_uid', user.uid).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
    return NextResponse.json({ mobileNumber: data.mobile_number || '' });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    const status = code === 'AUTH_REQUIRED' ? 401 : code === 'EMAIL_NOT_VERIFIED' ? 403 : 500;
    return NextResponse.json({ error: status === 500 ? 'Unable to load your profile.' : 'Please sign in again.' }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await verifiedUser(request);
    const payload = await request.json().catch(() => ({}));
    const raw = typeof payload.mobileNumber === 'string' ? payload.mobileNumber.trim() : '';
    const digits = raw.replace(/\D/g, '');
    const normalized = raw === '' ? null : digits.length === 12 && digits.startsWith('91') ? `+${digits}` : digits.length === 10 ? `+91${digits}` : null;

    if (raw !== '' && (!normalized || !/^\+91[6-9]\d{9}$/.test(normalized))) {
      return NextResponse.json({ error: 'Enter a valid 10-digit Indian mobile number.' }, { status: 400 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from('profiles')
      .update({ mobile_number: normalized, updated_at: new Date().toISOString() })
      .eq('firebase_uid', user.uid)
      .select('mobile_number')
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
    return NextResponse.json({ ok: true, mobileNumber: data.mobile_number || '' });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    const status = code === 'AUTH_REQUIRED' ? 401 : code === 'EMAIL_NOT_VERIFIED' ? 403 : 500;
    return NextResponse.json({ error: status === 500 ? 'Unable to update your profile.' : 'Please sign in again.' }, { status });
  }
}
