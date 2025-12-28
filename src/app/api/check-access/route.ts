import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// 1. Inicialização do Cliente Admin (ignora RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const API_SECRET = process.env.API_SECRET_TOKEN;

export async function POST(request: Request) {
  try {
    // 2. Verificação de Segurança (Bearer Token)
    const authHeader = request.headers.get('authorization');
    if (API_SECRET && authHeader !== `Bearer ${API_SECRET}`) {
      return NextResponse.json(
        { allowed: false, reason: 'Não autorizado' },
        { status: 401 }
      );
    }

    // 3. Extração do corpo da requisição
    const { rfid_uid } = await request.json();

    if (!rfid_uid) {
      return NextResponse.json(
        { allowed: false, reason: 'UID do RFID não fornecido' },
        { status: 400 }
      );
    }

    // Variáveis para o Log de Acesso
    let allowed = false;
    let reason = '';
    let customerName = 'Desconhecido';
    let customerId = null;

    // 4. Consulta ao Banco de Dados (Usando o Cliente Admin)
    const { data: customer, error } = await supabaseAdmin
      .from('customer')
      .select(`
        id, 
        name, 
        status,
        rfid_uid,
        subscription (
          id,
          end_date
        )
      `)
      .eq('rfid_uid', rfid_uid)
      .maybeSingle();

    if (error) {
      console.error("Erro no Supabase:", error.message);
      return NextResponse.json(
        { allowed: false, reason: 'Erro interno ao consultar o banco' },
        { status: 500 }
      );
    }

    // 5. Verificação de existência do aluno
    if (!customer) {
      await supabaseAdmin
        .from('pending_tags')
        .insert([{ rfid_uid: rfid_uid }]);

      return NextResponse.json({
        allowed: false,
        reason: 'Tag desconhecida. Enviada para a fila de cadastro.'
      });
    }

    // 6. Lógica de Assinatura: Encontrar a mais recente
    customerId = customer.id;
    customerName = customer.name;

    const subscriptions = customer.subscription || [];
    const lastSubscription = [...subscriptions].sort((a: any, b: any) =>
      new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
    )[0];

    if (!lastSubscription) {
      reason = 'Sem histórico de assinaturas';
    } else {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const dataVencimento = new Date(lastSubscription.end_date);

      if (dataVencimento >= hoje) {
        allowed = true;
        reason = 'Acesso liberado';
      } else {
        allowed = false;
        reason = `Mensalidade vencida em ${dataVencimento.toLocaleDateString('pt-BR')}`;
      }
    }

    // 7. Verificação de Validade (Data de término >= Hoje)
    await supabaseAdmin.from('access_logs').insert([{
      customer_id: customerId,
      customer_name: customerName,
      rfid_uid: rfid_uid,
      allowed: allowed,
      reason: reason
    }]);

    // 5. RESPOSTA FINAL PARA A PICO W
    return NextResponse.json({
      allowed,
      name: customerName,
      reason
    });

  } catch (err) {
    console.error('Erro crítico na rota:', err);
    return NextResponse.json({ allowed: false, reason: 'Erro interno' }, { status: 500 });
  }
}