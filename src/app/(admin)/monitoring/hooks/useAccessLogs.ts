import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AccessLog } from '../types';
import { playNotificationSound } from '../utils';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export function useAccessLogs() {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  // Estado real da subscription Realtime — antes o "Sistema Ativo" da UI
  // era puramente decorativo e não refletia isso. Ver
  // docs/05-divergences-and-risks.md (item ALTA/OPERACIONAL).
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  useEffect(() => {
    // Busca logs iniciais
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from('access_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(15);
      if (error) {
        console.error('Erro ao buscar access_logs:', error.message);
        return;
      }
      if (data) setLogs(data);
    };

    fetchLogs();

    // Inscrição Realtime
    const channel = supabase
      .channel('monitoring-room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'access_logs' },
        (payload) => {
          const newLog = payload.new as AccessLog;
          setLogs((prev) => [newLog, ...prev.slice(0, 14)]);
          playNotificationSound(newLog.allowed ? 'success' : 'error');
        }
      )
      .subscribe((subscriptionStatus) => {
        if (subscriptionStatus === 'SUBSCRIBED') {
          setStatus('connected');
        } else if (
          subscriptionStatus === 'CHANNEL_ERROR' ||
          subscriptionStatus === 'TIMED_OUT' ||
          subscriptionStatus === 'CLOSED'
        ) {
          setStatus('disconnected');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { logs, status };
}
