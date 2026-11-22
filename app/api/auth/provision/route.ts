import { NextResponse } from 'next/server';
import { firebaseAdminAuth } from '@/lib/firebase-admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get('authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

    const decoded = await firebaseAdminAuth().verifyIdToken(token, true);
    const payload = await request.clone().json().catch(() => ({}));
    const fullName = typeof payload.fullName === 'string' ? payload.fullName.trim().slice(0, 120) : (decoded.name || '');
    const mobileNumber = typeof payload.mobileNumber === 'string' ? payload.mobileNumber.trim() : '';
    if (!decoded.email || !decoded.email_verified) return NextResponse.json({ error: 'Verify your email before continuing.' }, { status: 403 });

    const email = decoded.email.trim().toLowerCase();
    const supabase = getSupabaseAdmin();
    const { data: allowed, error: allowError } = await supabase
      .from('email_whitelist').select('id').eq('email', email).maybeSingle();
    if (allowError) throw allowError;
    if (!allowed) return NextResponse.json({ error: 'This email is not on the workspace access list.' }, { status: 403 });

    const { data: existing, error: lookupError } = await supabase
      .from('profiles').select('id,approval_status').eq('firebase_uid', decoded.uid).maybeSingle();
    if (lookupError) throw lookupError;

    if (!/^\\+?[0-9 ()-]{8,20}$/.test(mobileNumber) && !existing) return NextResponse.json({ error: 'A valid mobile number is required to complete registration.' }, { status: 400 });

    const profileId = existing?.id || randomUUID();
    if (!existing) {
      const { error: insertError } = await supabase.from('profiles').insert({
        id: profileId, firebase_uid: decoded.uid, email,
        full_name: fullName || null, mobile_number: mobileNumber, role: 'employee', approval_status: 'pending'
      });
      if (insertError) throw insertError;
    } else if (existing.approval_status === 'suspended' || existing.approval_status === 'rejected') {
      return NextResponse.json({ error: 'Workspace access is currently unavailable. Contact your workspace administrator.' }, { status: 403 });
    }

    await firebaseAdminAuth().setCustomUserClaims(decoded.uid, { role: 'authenticated' });
    return NextResponse.json({ ok: true, profileId, approvalStatus: existing?.approval_status || 'pending' });
  } catch (error) {
    console.error('Authentication provisioning failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Unable to complete secure sign-in. Please try again.' }, { status: 500 });
  }
}
