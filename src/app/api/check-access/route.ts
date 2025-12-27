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
        { allowed: false, reason: 'Não autorizado: Token inválido' },
        { status: 401 }
      );
    }

    // 3. Extração do corpo da requisição
    const body = await request.json();
    const { rfid_uid } = body;

    if (!rfid_uid) {
      return NextResponse.json(
        { allowed: false, reason: 'UID do RFID não fornecido' },
        { status: 400 }
      );
    }

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
      // Salva a tag na fila de espera antes de retornar o erro
      await supabaseAdmin
        .from('pending_tags')
        .insert([{ rfid_uid: rfid_uid }]);

      return NextResponse.json({ 
        allowed: false, 
        reason: 'Tag desconhecida. Enviada para a fila de cadastro.' 
      });
    }

    // 6. Lógica de Assinatura: Encontrar a mais recente
    const subscriptions = customer.subscription || [];
    const lastSubscription = [...subscriptions].sort((a: any, b: any) => 
      new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
    )[0];

    if (!lastSubscription) {
      return NextResponse.json({ 
        allowed: false, 
        reason: 'Aluno sem histórico de assinaturas',
        name: customer.name 
      });
    }

    // 7. Verificação de Validade (Data de término >= Hoje)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Garante que quem vence hoje ainda entra
    
    const dataVencimento = new Date(lastSubscription.end_date);

    if (dataVencimento >= hoje) {
      return NextResponse.json({
        allowed: true,
        name: customer.name,
        reason: 'Acesso liberado',
        expires_at: lastSubscription.end_date
      });
    } else {
      return NextResponse.json({
        allowed: false,
        reason: 'Mensalidade vencida',
        name: customer.name,
        expired_at: lastSubscription.end_date
      });
    }

  } catch (err) {
    console.error('Erro na rota de acesso:', err);
    return NextResponse.json(
      { allowed: false, reason: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}