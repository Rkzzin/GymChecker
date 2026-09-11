import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Plan } from '../types';

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('plan')
        .select('*')
        .order('is_active', { ascending: false })
        .order('price', { ascending: true });
      
      if (error) throw error;
      if (data) setPlans(data as Plan[]);
    } catch (error) {
      console.error('Erro ao buscar planos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const savePlan = async (planData: Omit<Plan, 'id' | 'is_active'>, id?: string) => {
    try {
      if (id) {
        const { error } = await supabase
          .from('plan')
          .update(planData)
          .eq('id', id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('plan')
          .insert([{ ...planData, is_active: true }]);

        if (error) throw error;
      }
      
      await fetchPlans();
    } catch (error) {
      console.error('Erro ao salvar plano:', error);
      throw error;
    }
  };
  
  const toggleStatus = async (plan: Plan) => {
    try {
      const { error } = await supabase
        .from('plan')
        .update({ is_active: !plan.is_active })
        .eq('id', plan.id);

      if (error) throw error;
      
      setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_active: !p.is_active } : p));
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Não foi possível alterar o status do plano.');
    }
  };

  useEffect(() => {
    (async () => {
      await fetchPlans();
    })();
  }, [fetchPlans]);

  return { plans, loading, savePlan, toggleStatus };
}
