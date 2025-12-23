import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plan } from '../types';

interface CreateMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  plans: Plan[];
  darkMode: boolean;
}

export function CreateMemberModal({ isOpen, onClose, onSuccess, plans, darkMode }: CreateMemberModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [newMemberData, setNewMemberData] = useState({
    name: '', email: '', phone: '', customerNotes: '', rfid_uid: '',
  });
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [paymentData, setPaymentData] = useState({ method: 'pix', notes: '' });

  // Tenta selecionar o primeiro plano automaticamente
  useEffect(() => {
    if (isOpen && plans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plans[0].id);
    }
  }, [isOpen, plans, selectedPlanId]);

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberData.name.trim() || !selectedPlanId) return;
    setSubmitting(true);

    try {
      const selectedPlan = plans.find(p => p.id === selectedPlanId);
      if (!selectedPlan) throw new Error("Plano inválido");

      const { data: newCustomer, error: custError } = await supabase
        .from('customer')
        .insert([{
          name: newMemberData.name,
          email: newMemberData.email,
          phone: newMemberData.phone,
          notes: newMemberData.customerNotes,
          rfid_uid: newMemberData.rfid_uid,
          status: 'active'
        }])
        .select().single();

      if (custError) throw custError;

      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + selectedPlan.duration_days);

      const { data: newSub, error: subError } = await supabase
        .from('subscription')
        .insert([{
          customer_id: newCustomer.id,
          plan_id: selectedPlan.id,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        }])
        .select().single();

      if (subError) throw subError;

      await supabase.from('payment').insert([{
        customer_id: newCustomer.id,
        subscription_id: newSub.id,
        amount: selectedPlan.price,
        payment_date: new Date().toISOString(),
        method: paymentData.method,
        notes: paymentData.notes
      }]);

      setNewMemberData({ name: '', email: '', phone: '', customerNotes: '', rfid_uid: '' });
      setPaymentData({ method: 'pix', notes: '' });
      setSelectedPlanId(plans.length > 0 ? plans[0].id : '');
      onSuccess();
      onClose();

    } catch (error: any) {
      alert('Erro: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const cardClass = darkMode ? 'bg-gray-900 border-gray-800 text-gray-100' : 'bg-white border-gray-200 text-gray-900';
  const inputClass = darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
      <div className={`rounded-xl shadow-2xl w-full max-w-md p-6 ${cardClass} border animate-in fade-in zoom-in duration-200`}>
        <h2 className="text-xl font-bold mb-4">Novo Aluno</h2>
        <form onSubmit={handleCreateMember} className="space-y-4">
          <div><label className="block text-xs font-bold uppercase mb-1 opacity-70">Nome Completo</label><input autoFocus type="text" value={newMemberData.name} onChange={e => setNewMemberData({ ...newMemberData, name: e.target.value })} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`} required /></div>
          <div><label className="block text-xs font-bold uppercase mb-1 opacity-70">Tag RFID (Passe o cartão)</label><input type="text" value={newMemberData.rfid_uid} onChange={e => setNewMemberData({ ...newMemberData, rfid_uid: e.target.value })} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`} placeholder="Clique aqui e passe a tag..."/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-bold uppercase mb-1 opacity-70">Telefone</label><input type="text" value={newMemberData.phone} onChange={e => setNewMemberData({ ...newMemberData, phone: e.target.value })} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`} /></div>
            <div><label className="block text-xs font-bold uppercase mb-1 opacity-70">Email</label><input type="email" value={newMemberData.email} onChange={e => setNewMemberData({ ...newMemberData, email: e.target.value })} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`} /></div>
          </div>

          <div><label className="block text-xs font-bold uppercase mb-1 opacity-70">Anotações</label><textarea rows={2} value={newMemberData.customerNotes} onChange={e => setNewMemberData({ ...newMemberData, customerNotes: e.target.value })} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`} /></div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
            <h3 className="text-xs font-bold text-orange-500 uppercase mb-3">Matrícula Inicial</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-bold uppercase mb-1 opacity-70">Plano</label>
                <select
                  value={selectedPlanId}
                  onChange={e => setSelectedPlanId(e.target.value)}
                  className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`}
                  required
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - R${p.price.toFixed(2)}</option>
                  ))}
                </select>
              </div>
              <div><label className="block text-xs font-bold uppercase mb-1 opacity-70">Pagamento</label><select value={paymentData.method} onChange={e => setPaymentData({ ...paymentData, method: e.target.value })} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`}><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="transferencia">Transf.</option></select></div>
            </div>
            <div><label className="block text-xs font-bold uppercase mb-1 opacity-70">Obs. Financeira</label><input type="text" value={paymentData.notes} onChange={e => setPaymentData({ ...paymentData, notes: e.target.value })} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`} placeholder="Ex: Pago parcial..." /></div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>Cancelar</button>
            <button type="submit" disabled={submitting || plans.length === 0} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-lg font-bold shadow-lg shadow-orange-500/20 disabled:opacity-50">{submitting ? '...' : 'Confirmar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}