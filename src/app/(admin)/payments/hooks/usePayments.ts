import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Payment } from '../types';

export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const y = yearFilter;
      const m = String(monthFilter).padStart(2, '0');
      const startDate = `${y}-${m}-01T00:00:00.000Z`;
      let nextM = monthFilter + 1;
      let nextY = yearFilter;
      if (nextM > 12) { nextM = 1; nextY++; }
      const endDate = `${nextY}-${String(nextM).padStart(2, '0')}-01T00:00:00.000Z`;

      const { data, error } = await supabase
        .from('payment')
        .select(`id, amount, payment_date, method, notes, customer (name)`)
        .gte('payment_date', startDate)
        .lt('payment_date', endDate)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data as any);
    } catch (error) {
      console.error('Erro ao buscar pagamentos:', error);
    } finally {
      setLoading(false);
    }
  }, [monthFilter, yearFilter]);

  const updatePayment = async (id: string, updates: Partial<Payment>) => {
     const { error } = await supabase.from('payment').update(updates).eq('id', id);
     if (error) throw error;
     await fetchPayments();
  };

  useEffect(() => {
    (async () => {
      await fetchPayments();
    })();
  }, [fetchPayments]);

  return {
    payments,
    loading,
    monthFilter,
    setMonthFilter,
    yearFilter,
    setYearFilter,
    refreshPayments: fetchPayments,
    updatePayment
  };
}
