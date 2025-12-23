import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Importando seu cliente já configurado

// Defina um token simples no seu .env.local para proteger a porta
// Ex: API_SECRET_TOKEN="segredo_da_academia_123"
const API_SECRET = process.env.API_SECRET_TOKEN;

export async function POST(request: Request) {
  try {
    // 1. Verificação de Segurança (Token)
    // O Pico W deve enviar o header: "Authorization: Bearer segredo..."
    const authHeader = request.headers.get('authorization');
    
    if (API_SECRET && authHeader !== `Bearer ${API_SECRET}`) {
      return NextResponse.json(
        { allowed: false, reason: 'Unauthorized: Invalid Token' },
        { status: 401 }
      );
    }

    // 2. Pegar o UID enviado pelo Pico W
    const body = await request.json();
    const { rfid_uid } = body;

    if (!rfid_uid) {
      return NextResponse.json(
        { allowed: false, reason: 'Missing RFID UID' },
        { status: 400 }
      );
    }

    // 3. Buscar o Cliente e a Assinatura (Lógica baseada no seu useMembers.ts)
    const { data: customer, error } = await supabase
      .from('customer')
      .select(`
        id, 
        name, 
        status,
        subscription (
          end_date
        )
      `)
      .eq('rfid_uid', rfid_uid)
      .eq('status', 'active') // Apenas alunos ativos
      .single();

    // Se não achou aluno com essa tag ou deu erro
    if (error || !customer) {
      return NextResponse.json({ 
        allowed: false, 
        reason: 'Tag não encontrada ou aluno inativo' 
      });
    }

    // 4. Validar a Mensalidade
    // Pega a última assinatura (igual você faz no useMembers)
    const subscriptions = customer.subscription || [];
    
    // Ordena para pegar a data mais futura
    const lastSubscription = subscriptions.sort((a: any, b: any) => 
      new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
    )[0];

    if (!lastSubscription) {
      return NextResponse.json({ 
        allowed: false, 
        reason: 'Aluno sem assinatura',
        name: customer.name 
      });
    }

    const hoje = new Date();
    const validade = new Date(lastSubscription.end_date);
    
    // Verifica se a validade é maior ou igual a hoje (considerando fuso horário se necessário)
    // Dica: Adicione um dia de margem se quiser evitar bloqueio no dia exato do vencimento
    const isMensalidadeValida = validade >= hoje;

    if (isMensalidadeValida) {
      return NextResponse.json({
        allowed: true,
        name: customer.name,
        valid_until: lastSubscription.end_date
      });
    } else {
      return NextResponse.json({
        allowed: false,
        reason: 'Mensalidade Vencida',
        name: customer.name,
        expired_at: lastSubscription.end_date
      });
    }

  } catch (error) {
    console.error('Erro na API de acesso:', error);
    return NextResponse.json(
      { allowed: false, reason: 'Internal Server Error' },
      { status: 500 }
    );
  }
}