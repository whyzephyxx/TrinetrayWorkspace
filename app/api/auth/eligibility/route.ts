import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ eligible: false }, { status: 400 });
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('email_whitelist').select('id').eq('email', email).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ eligible: Boolean(data) });
  } catch {
    return NextResponse.json({ eligible: false }, { status: 500 });
  }
}
