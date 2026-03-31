import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const API_SECRET = process.env.API_SECRET_TOKEN;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (API_SECRET && authHeader !== `Bearer ${API_SECRET}`) {
    return NextResponse.json({ rfid_uid: null }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('pending_tags')
    .select('id, rfid_uid')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ rfid_uid: null });

  await supabaseAdmin
    .from('pending_tags')
    .delete()
    .eq('id', data.id);

  return NextResponse.json({ rfid_uid: data.rfid_uid });
}