import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const API_SECRET = process.env.API_SECRET_TOKEN;

export async function POST(request: Request) {
  try {
    // Fail closed: se API_SECRET_TOKEN não estiver configurada, a rota
    // recusa TODAS as requisições em vez de aceitar sem autenticação.
    // Ver docs/05-divergences-and-risks.md (item ALTA).
    if (!API_SECRET) {
      console.error('API_SECRET_TOKEN não configurada — recusando requisição por segurança.');
      return NextResponse.json({ allowed: false, reason: 'Serviço não configurado' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${API_SECRET}`) {
      return NextResponse.json({ allowed: false, reason: 'Não autorizado' }, { status: 401 });
    }

    const { rfid_uid } = await request.json();
    if (!rfid_uid) {
      return NextResponse.json({ allowed: false, reason: 'UID não fornecido' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.rpc('check_access_and_log', { 
      p_rfid_uid: rfid_uid 
    });

    if (error) {
      console.error("Erro no RPC do Supabase:", error.message);
      return NextResponse.json({ allowed: false, reason: 'Erro no banco' }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (err) {
    console.error('Erro crítico na API:', err);
    return NextResponse.json({ allowed: false, reason: 'Erro interno' }, { status: 500 });
  }
}