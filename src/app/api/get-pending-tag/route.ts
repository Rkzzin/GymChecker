import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  // Este endpoint é chamado só de dentro do painel admin (já protegido por
  // useAuthGuard no client), mas a rota em si não validava nada — qualquer
  // requisição não-autenticada podia ler e consumir a tag RFID pendente.
  // Exigimos aqui uma sessão Supabase válida via Bearer <access_token>.
  // Ver docs/05-divergences-and-risks.md (item ALTA).
  const authHeader = request.headers.get('authorization');
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!accessToken) {
    return NextResponse.json({ rfid_uid: null, reason: 'Não autorizado' }, { status: 401 });
  }

  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
  if (authError || !userData?.user) {
    return NextResponse.json({ rfid_uid: null, reason: 'Não autorizado' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('pending_tags')
    .select('id, rfid_uid')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar pending_tags:', error.message);
    return NextResponse.json({ rfid_uid: null }, { status: 500 });
  }

  if (!data) return NextResponse.json({ rfid_uid: null });

  await supabaseAdmin
    .from('pending_tags')
    .delete()
    .eq('id', data.id);

  return NextResponse.json({ rfid_uid: data.rfid_uid });
}
