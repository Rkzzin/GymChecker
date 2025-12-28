import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const API_SECRET = process.env.API_SECRET_TOKEN;

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (API_SECRET && authHeader !== `Bearer ${API_SECRET}`) {
      return NextResponse.json({ allowed: false, reason: 'Não autorizado' }, { status: 401 });
    }

    const { rfid_uid } = await request.json();
    if (!rfid_uid) {
      return NextResponse.json({ allowed: false, reason: 'UID não fornecido' }, { status: 400 });
    }

    // Variáveis de controle para o log
    let allowed = false;
    let reason = '';
    let customerName = 'Desconhecido';
    let customerId = null;

    // 1. Consulta ao Banco
    const { data: customer, error } = await supabaseAdmin
      .from('customer')
      .select(`
        id, 
        name, 
        status,
        subscription (
          id,
          end_date
        )
      `)
      .eq('rfid_uid', rfid_uid)
      .maybeSingle();

    if (error) {
      console.error("Erro no Supabase:", error.message);
      return NextResponse.json({ allowed: false, reason: 'Erro no banco' }, { status: 500 });
    }

    // 2. Lógica de Decisão
    if (!customer) {
      // TAG DESCONHECIDA
      reason = 'Tag desconhecida. Enviada para cadastro.';
      await supabaseAdmin.from('pending_tags').insert([{ rfid_uid }]);
      // Nota: Não damos 'return' aqui para permitir que o log seja gravado abaixo
    } else {
      // ALUNO ENCONTRADO
      customerId = customer.id;
      customerName = customer.name;

      const subscriptions = customer.subscription || [];
      const lastSub = [...subscriptions].sort((a: any, b: any) =>
        new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
      )[0];

      if (!lastSub) {
        reason = 'Aluno sem histórico de assinaturas';
      } else {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dataVencimento = new Date(lastSub.end_date);

        if (dataVencimento >= hoje) {
          allowed = true;
          reason = 'Acesso liberado';
        } else {
          allowed = false;
          reason = `Mensalidade vencida em ${dataVencimento.toLocaleDateString('pt-BR')}`;
        }
      }
    }

    // 3. GRAVAÇÃO DO LOG (Sempre executa, com ou sem aluno)
    await supabaseAdmin.from('access_logs').insert([{
      customer_id: customerId,
      customer_name: customerName, 
      rfid_uid: rfid_uid,
      allowed: allowed,
      reason: reason
    }]);

    // 4. RESPOSTA PARA A PICO W
    return NextResponse.json({
      allowed,
      name: customerName,
      reason
    });

  } catch (err) {
    console.error('Erro crítico:', err);
    return NextResponse.json({ allowed: false, reason: 'Erro interno' }, { status: 500 });
  }
}