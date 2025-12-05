import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MemberWithMembership, Plan } from '../types';

interface RenewMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  member: MemberWithMembership | null;
  plans: Plan[];
  darkMode: boolean;
}

export function RenewMemberModal({ isOpen, onClose, onSuccess, member, plans, darkMode }: RenewMemberModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [paymentData, setPaymentData] = useState({ method: 'pix', notes: '' });

  // Lógica para selecionar o plano ideal ou o primeiro disponível
  useEffect(() => {
    if (isOpen && plans.length > 0) {
      const lastPlanStillActive = member?.lastPlanId && plans.some(p => p.id === member.lastPlanId);
      
      if (lastPlanStillActive && member?.lastPlanId) {
        setSelectedPlanId(member.lastPlanId);
      } else {
        setSelectedPlanId(plans[0].id);
      }
    }
  }, [isOpen, member, plans]);

  const handleConfirmRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !selectedPlanId) return;
    setSubmitting(true);

    try {
      const selectedPlan = plans.find(p => p.id === selectedPlanId);
      if (!selectedPlan) throw new Error("Plano inválido ou não encontrado.");

      const today = new Date();
      let start = today;
      
      if (member.rawEndDate) {
        const lastEnd = new Date(member.rawEndDate);
        if (lastEnd > today) start = lastEnd;
      }

      const end = new Date(start);
      end.setDate(end.getDate() + selectedPlan.duration_days);

      const { data: sub, error: subError } = await supabase.from('subscription').insert({
        customer_id: member.id,
        plan_id: selectedPlan.id,
        start_date: start.toISOString(),
        end_date: end.toISOString()
      }).select().single();

      if (subError) throw subError;

      await supabase.from('payment').insert({
        customer_id: member.id,
        subscription_id: sub.id,
        amount: selectedPlan.price,
        payment_date: new Date().toISOString(),
        method: paymentData.method,
        notes: paymentData.notes
      });

      setPaymentData({ method: 'pix', notes: '' });
      onSuccess();
      onClose();

    } catch (error: any) {
      alert('Erro ao renovar: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !member) return null;

  const cardClass = darkMode ? 'bg-gray-900 border-gray-800 text-gray-100' : 'bg-white border-gray-200 text-gray-900';
  const inputClass = darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
      <div className={`rounded-xl shadow-2xl w-full max-w-md p-6 ${cardClass} border animate-in fade-in zoom-in duration-200`}>
        <h2 className="text-xl font-bold mb-1">Renovar Matrícula</h2>
        <p className="text-sm opacity-70 mb-6">Aluno: <span className="font-bold text-orange-500">{member.name}</span></p>
        
        <form onSubmit={handleConfirmRenew} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase mb-1 opacity-70">Plano</label>
            <select 
              value={selectedPlanId} 
              onChange={e => setSelectedPlanId(e.target.value)} 
              className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`} 
              required
            >
              {plans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} - R${p.price.toFixed(2)} ({p.duration_days} dias)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1 opacity-70">Forma de Pagamento</label>
            <select value={paymentData.method} onChange={e => setPaymentData({ ...paymentData, method: e.target.value })} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`}>
              <option value="pix">Pix</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="transferencia">Transferência</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1 opacity-70">Obs. Financeira</label>
            <input type="text" value={paymentData.notes} onChange={e => setPaymentData({ ...paymentData, notes: e.target.value })} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`} placeholder="Opcional..." />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>Cancelar</button>
            <button 
              type="submit" 
              disabled={submitting || plans.length === 0} 
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-bold shadow-lg shadow-green-500/20 disabled:opacity-50"
            >
              {submitting ? '...' : 'Confirmar & Pagar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}