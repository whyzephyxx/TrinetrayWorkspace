import { NextResponse } from 'next/server';
import { firebaseAdminAuth } from '@/lib/firebase-admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let stage = 'read_request';
  try {
    const authorization = request.headers.get('authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

    stage = 'verify_firebase_token';
    const decoded = await firebaseAdminAuth().verifyIdToken(token, true);
    const payload = await request.clone().json().catch(() => ({}));
    const fullName = typeof payload.fullName === 'string' ? payload.fullName.trim().slice(0, 120) : decoded.name || '';

    if (!decoded.email || !decoded.email_verified) {
      return NextResponse.json({ error: 'Verify your email before continuing.' }, { status: 403 });
    }

    const email = decoded.email.trim().toLowerCase();
    stage = 'initialize_supabase_admin';
    const supabase = getSupabaseAdmin();

    stage = 'check_email_whitelist';
    const { data: allowed, error: allowError } = await supabase
      .from('email_whitelist').select('id').eq('email', email).maybeSingle();
    if (allowError) throw allowError;
    if (!allowed) return NextResponse.json({ error: 'This email is not on the workspace access list.' }, { status: 403 });

    stage = 'lookup_existing_profile';
    const { data: existing, error: lookupError } = await supabase
      .from('profiles').select('id,approval_status').eq('firebase_uid', decoded.uid).maybeSingle();
    if (lookupError) throw lookupError;

    if (existing?.approval_status === 'suspended' || existing?.approval_status === 'rejected') {
      return NextResponse.json({ error: 'Workspace access is currently unavailable. Contact your workspace administrator.' }, { status: 403 });
    }

    const profileId = existing?.id || randomUUID();
    if (!existing) {
      stage = 'insert_employee_profile';
      const { error: insertError } = await supabase.from('profiles').insert({
        id: profileId,
        firebase_uid: decoded.uid,
        email,
        full_name: fullName || null,
        mobile_number: null,
        role: 'employee',
        approval_status: 'pending'
      });
      if (insertError) throw insertError;
    }

    stage = 'set_firebase_custom_claim';
    await firebaseAdminAuth().setCustomUserClaims(decoded.uid, { role: 'authenticated' });
    return NextResponse.json({ ok: true, profileId, approvalStatus: existing?.approval_status || 'pending' });
  } catch (error) {
    const safeError = error && typeof error === 'object' ? error as { code?: unknown; message?: unknown } : null;
    console.error('Authentication provisioning failed:', JSON.stringify({
      stage,
      code: typeof safeError?.code === 'string' ? safeError.code : undefined,
      message: typeof safeError?.message === 'string' ? safeError.message : error instanceof Error ? error.message : String(error)
    }));
    return NextResponse.json({ error: 'Unable to complete secure sign-in. Please try again.' }, { status: 500 });
  }
}
