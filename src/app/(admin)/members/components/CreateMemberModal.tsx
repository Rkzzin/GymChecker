import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plan } from '../types';
import { Wifi } from 'lucide-react'; // Opcional: ícone para o botão

interface CreateMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  plans: Plan[];
  darkMode: boolean;
}

export function CreateMemberModal({ isOpen, onClose, onSuccess, plans, darkMode }: CreateMemberModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [loadingTag, setLoadingTag] = useState(false); // Estado para feedback no botão
  const [newMemberData, setNewMemberData] = useState({
    name: '', email: '', phone: '', customerNotes: '', rfid_uid: '',
  });
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [paymentData, setPaymentData] = useState({ method: 'pix', notes: '' });

  // Função para buscar a última tag pendente na API
  const capturarTag = async () => {
    setLoadingTag(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Sessão expirada. Faça login novamente.');
        return;
      }
      const res = await fetch('/api/get-pending-tag', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      
      if (data.rfid_uid) {
        // Atualiza o rfid_uid dentro do objeto principal do formulário
        setNewMemberData(prev => ({ ...prev, rfid_uid: data.rfid_uid }));
      } else {
        alert("Nenhuma tag pendente encontrada. Passe a tag no leitor primeiro.");
      }
    } catch (err) {
      console.error("Erro ao capturar tag:", err);
      alert("Erro ao conectar com a API de captura.");
    } finally {
      setLoadingTag(false);
    }
  };

  // Se as plans carregarem depois do modal já aberto, seleciona a primeira
  // como default assim que estiverem disponíveis — calculado direto no
  // render em vez de copiado para state via efeito (evita o passo extra
  // de render que o efeito causaria).
  const effectiveSelectedPlanId = selectedPlanId || (isOpen && plans.length > 0 ? plans[0].id : '');

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberData.name.trim() || !effectiveSelectedPlanId) return;
    setSubmitting(true);

    try {
      const selectedPlan = plans.find(p => p.id === effectiveSelectedPlanId);
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
  const inputClass = darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';
  const btnSecondaryClass = darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
      <div className={`rounded-xl shadow-2xl w-full max-w-md p-6 ${cardClass} border animate-in fade-in zoom-in duration-200`}>
        <h2 className="text-xl font-bold mb-4">Novo Aluno</h2>
        <form onSubmit={handleCreateMember} className="space-y-4">
          
          <div>
            <label className="block text-xs font-bold uppercase mb-1 opacity-70">Nome Completo</label>
            <input autoFocus type="text" value={newMemberData.name} onChange={e => setNewMemberData({ ...newMemberData, name: e.target.value })} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`} required />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1 opacity-70">Tag RFID</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newMemberData.rfid_uid} 
                onChange={e => setNewMemberData({ ...newMemberData, rfid_uid: e.target.value })} 
                className={`flex-1 border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`} 
                placeholder="ID da Tag..."
              />
              <button 
                type="button"
                onClick={capturarTag}
                disabled={loadingTag}
                className={`px-3 rounded-lg border flex items-center justify-center transition-all ${btnSecondaryClass} ${loadingTag ? 'opacity-50' : ''}`}
                title="Capturar última tag lida no leitor"
              >
                {loadingTag ? (
                  <span className="text-[10px] font-bold animate-pulse">LENDO...</span>
                ) : (
                  <span className="text-[10px] font-bold">CAPTURAR</span>
                )}
              </button>
            </div>
            <p className="text-[10px] mt-1 opacity-50 italic">Passe a tag no leitor da porta e clique em capturar.</p>
          </div>

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
                  value={effectiveSelectedPlanId}
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
            <button type="button" onClick={onClose} className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${btnSecondaryClass}`}>Cancelar</button>
            <button type="submit" disabled={submitting || plans.length === 0} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-lg font-bold shadow-lg shadow-orange-500/20 disabled:opacity-50">{submitting ? '...' : 'Confirmar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}