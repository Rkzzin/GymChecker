import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AccessLog } from '../types';
import { playNotificationSound } from '../utils';

export function useAccessLogs() {
  const [logs, setLogs] = useState<AccessLog[]>([]);

  useEffect(() => {
    // Busca logs iniciais
    const fetchLogs = async () => {
      const { data } = await supabase
        .from('access_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(15);
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { logs };
}