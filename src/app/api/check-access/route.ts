import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Certifique-se de configurar esta variável no dashboard da Vercel
const API_SECRET = process.env.API_SECRET_TOKEN;

export async function POST(request: Request) {
  try {
    // 1. Verificação de Segurança (Bearer Token)
    const authHeader = request.headers.get('authorization');
    if (API_SECRET && authHeader !== `Bearer ${API_SECRET}`) {
      return NextResponse.json(
        { allowed: false, reason: 'Não autorizado: Token inválido' },
        { status: 401 }
      );
    }

    // 2. Extração do corpo da requisição
    const body = await request.json();
    const { rfid_uid } = body;

    if (!rfid_uid) {
      return NextResponse.json(
        { allowed: false, reason: 'UID do RFID não fornecido' },
        { status: 400 }
      );
    }

    // 3. Consulta ao Supabase usando .maybeSingle() para evitar erros se não houver match
    // Buscamos o cliente e todas as suas assinaturas
    const { data: customer, error } = await supabase
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

    // 4. Se a tag não for encontrada no banco
    if (!customer) {
      return NextResponse.json({ 
        allowed: false, 
        reason: 'Tag não cadastrada no sistema' 
      });
    }

    // 5. Lógica de Assinatura: Encontrar a mais recente
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

    // 6. Verificação de Validade (Data de término >= Hoje)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Zera as horas para inclusividade no dia do vencimento
    
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