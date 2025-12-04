'use client';

import { useAuthGuard } from '../hooks/useAuth';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// --- Interfaces ---
interface Plan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
}

interface MemberWithMembership {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: 'active' | 'archived';
  startDate: string | null;
  endDate: string | null;
  rawEndDate: string | null;
  isInactive: boolean; // Indica se passou da tolerância (5 dias)
  lastPlanName?: string;
  lastPlanId?: string;
}

export default function Members() {
  useAuthGuard();

  // --- Estados ---
  const [sortedMembers, setSortedMembers] = useState<MemberWithMembership[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortCriteria, setSortCriteria] = useState<string>('endDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [view, setView] = useState<'active' | 'archived'>('active');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // --- Modais ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newMemberData, setNewMemberData] = useState({
    name: '', email: '', phone: '', customerNotes: ''
  });
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [paymentData, setPaymentData] = useState({ method: 'pix', notes: '' });

  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [memberToRenew, setMemberToRenew] = useState<MemberWithMembership | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<{ id: string, name: string, email: string, phone: string, notes: string } | null>(null);

  // --- Efeitos ---
  useEffect(() => {
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme !== null) setDarkMode(savedTheme === 'true');
    fetchPlans();
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
    fetchMembersAndSubscriptions();
  }, [view]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  // --- Buscas ---
  const fetchPlans = async () => {
    const { data } = await supabase
      .from('plan')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (data) {
      setPlans(data);
      if (data.length > 0) setSelectedPlanId(data[0].id);
    }
  };

  const fetchMembersAndSubscriptions = async () => {
    setLoading(true);
    try {
      const { data: customers, error } = await supabase
        .from('customer')
        .select(`
          id, name, email, phone, notes, status,
          subscription (id, start_date, end_date, plan (id, name))
        `)
        .eq('status', view);

      if (error) throw error;

      if (customers) {
        const processedData = customers.map((customer: any) => {
          const subscriptions = customer.subscription || [];
          const lastSubscription = subscriptions.sort((a: any, b: any) => {
            return new Date(b.end_date).getTime() - new Date(a.end_date).getTime();
          })[0];

          // Verifica se é inativo (mais de 5 dias vencido)
          const inactiveStatus = lastSubscription ? isInactiveMoreThan5Days(lastSubscription.end_date) : false;

          return {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            notes: customer.notes,
            status: customer.status,
            startDate: lastSubscription ? new Date(lastSubscription.start_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : null,
            endDate: lastSubscription ? new Date(lastSubscription.end_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : null,
            rawEndDate: lastSubscription ? lastSubscription.end_date : null,
            isInactive: inactiveStatus,
            lastPlanName: lastSubscription?.plan?.name,
            lastPlanId: lastSubscription?.plan?.id
          };
        });

        // Ordenação padrão: Inativos no topo (opcional) ou Vencimento mais antigo
        processedData.sort((a: any, b: any) => {
          if (!a.rawEndDate && b.rawEndDate) return 1;
          if (a.rawEndDate && !b.rawEndDate) return -1;
          if (!a.rawEndDate && !b.rawEndDate) return 0;
          return new Date(a.rawEndDate).getTime() - new Date(b.rawEndDate).getTime();
        });

        setSortedMembers(processedData);
      }
    } catch (error) {
      console.error('Erro ao buscar membros:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Ordenação Manual ---
  const handleSort = (field: 'name' | 'startDate' | 'endDate') => {
    const nextDir = sortCriteria === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortCriteria(field);
    setSortDirection(nextDir);

    const sorted = [...sortedMembers].sort((a, b) => {
      const dir = nextDir === 'asc' ? 1 : -1;

      if (field === 'endDate' || field === 'startDate') {
        const valA = field === 'endDate'
          ? (a.rawEndDate ? new Date(a.rawEndDate).getTime() : (dir === 1 ? Infinity : -Infinity))
          : (a.startDate ? new Date(a.startDate.split('/').reverse().join('-')).getTime() : 0);

        const valB = field === 'endDate'
          ? (b.rawEndDate ? new Date(b.rawEndDate).getTime() : (dir === 1 ? Infinity : -Infinity))
          : (b.startDate ? new Date(b.startDate.split('/').reverse().join('-')).getTime() : 0);

        return dir * (valA - valB);
      }

      return dir * a.name.localeCompare(b.name);
    });

    setSortedMembers(sorted);
  };

  // --- Ações ---
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

      setNewMemberData({ name: '', email: '', phone: '', customerNotes: '' });
      setPaymentData({ method: 'pix', notes: '' });
      setIsCreateModalOpen(false);
      fetchMembersAndSubscriptions();

    } catch (error: any) {
      alert('Erro: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberToEdit) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('customer')
        .update({
          name: memberToEdit.name,
          email: memberToEdit.email,
          phone: memberToEdit.phone,
          notes: memberToEdit.notes
        })
        .eq('id', memberToEdit.id);

      if (error) throw error;
      setIsEditModalOpen(false);
      setMemberToEdit(null);
      fetchMembersAndSubscriptions();
    } catch (error: any) {
      alert('Erro ao atualizar: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberToRenew || !selectedPlanId) return;
    setSubmitting(true);

    try {
      const selectedPlan = plans.find(p => p.id === selectedPlanId);
      if (!selectedPlan) throw new Error("Plano inválido");

      const today = new Date();
      let start = today;
      if (memberToRenew.rawEndDate) {
        const lastEnd = new Date(memberToRenew.rawEndDate);
        if (lastEnd > today) start = lastEnd;
      }

      const end = new Date(start);
      end.setDate(end.getDate() + selectedPlan.duration_days);

      const { data: sub, error: subError } = await supabase.from('subscription').insert({
        customer_id: memberToRenew.id,
        plan_id: selectedPlan.id,
        start_date: start.toISOString(),
        end_date: end.toISOString()
      }).select().single();

      if (subError) throw subError;

      await supabase.from('payment').insert({
        customer_id: memberToRenew.id,
        subscription_id: sub.id,
        amount: selectedPlan.price,
        payment_date: new Date().toISOString(),
        method: paymentData.method,
        notes: paymentData.notes
      });

      setIsRenewModalOpen(false);
      setMemberToRenew(null);
      setPaymentData({ method: 'pix', notes: '' });
      fetchMembersAndSubscriptions();

    } catch (error: any) {
      alert('Erro ao renovar: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openRenewModal = (member: MemberWithMembership) => {
    setMemberToRenew(member);
    const planToSelect = member.lastPlanId && plans.some(p => p.id === member.lastPlanId) ? member.lastPlanId : plans[0]?.id || '';
    setSelectedPlanId(planToSelect);
    setPaymentData({ method: 'pix', notes: '' });
    setIsRenewModalOpen(true);
  };

  const openEditModal = (member: MemberWithMembership) => {
    setMemberToEdit({
      id: member.id,
      name: member.name,
      email: member.email || '',
      phone: member.phone || '',
      notes: member.notes || ''
    });
    setIsEditModalOpen(true);
  };

  const handleToggleArchiveMember = async (member: MemberWithMembership) => {
    const newStatus = member.status === 'active' ? 'archived' : 'active';
    const action = newStatus === 'archived' ? 'arquivar' : 'reativar';
    if (window.confirm(`Deseja realmente ${action} ${member.name}?`)) {
      await supabase.from('customer').update({ status: newStatus }).eq('id', member.id);
      setSortedMembers(prev => prev.filter(m => m.id !== member.id));
    }
  };

  // --- Helpers de Data ---
  // Calcula se venceu há mais de 5 dias (Tolerância)
  const isInactiveMoreThan5Days = (endDateIso: string) => {
    if (!endDateIso) return false;
    const end = new Date(endDateIso);
    const now = new Date();
    // Diferença em milissegundos convertida para dias
    const diffTime = now.getTime() - end.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));
    return diffDays > 5; // Se passou de 5 dias do vencimento
  };

  const isWithinExpirationRange = (endDateStr: string | null): boolean => {
    if (!endDateStr) return false;
    const [day, month, year] = endDateStr.split('/').map(Number);
    const endDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const timeDiff = endDate.getTime() - today.getTime();
    const diffDays = Math.floor(timeDiff / (1000 * 3600 * 24));
    // Avisa se está vencendo (entre -5 dias antes e 3 dias depois)
    return diffDays >= -5 && diffDays <= 3;
  };

  // --- Estilos ---
  const bgClass = darkMode ? 'bg-black text-gray-100' : 'bg-gray-50 text-gray-900';
  const cardClass = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const headerClass = darkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-200';
  const linkClass = darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900';
  const inputClass = darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900';

  return (
    <div className={`min-h-screen ${bgClass} transition-colors duration-300`}>
      {/* Header */}
      <header className={`sticky top-0 z-30 border-b ${headerClass} backdrop-blur-md bg-opacity-95`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2 select-none">
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-orange-500">RLFITNESS</span>
              <span className={`${darkMode ? 'text-white' : 'text-gray-900'} mx-1`}>|</span>
              <span className={darkMode ? 'text-gray-200' : 'text-gray-800'}>EVOLUTION</span>
            </h1>
          </div>
          <nav className="hidden md:flex space-x-8">
            <a href="/dashboard" className={`${linkClass} font-medium text-sm transition-colors`}>Dashboard</a>
            <a href="/members" className="text-orange-500 font-semibold text-sm">Membros</a>
            <a href="/memberships" className={`${linkClass} font-medium text-sm transition-colors`}>Matrículas</a>
            <a href="/plans" className={`${linkClass} font-medium text-sm transition-colors`}>Planos</a>
            <a href="/payments" className={`${linkClass} font-medium text-sm transition-colors`}>Financeiro</a>
          </nav>
          <button onClick={toggleDarkMode} className={`p-2 rounded-full transition-colors ${darkMode ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {darkMode ? '☀' : '☾'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

        {/* Barra de Ações e Filtro */}
        <div className={`mb-6 p-4 rounded-xl shadow-sm border flex flex-col sm:flex-row justify-between items-center gap-4 ${cardClass}`}>
          <div className="relative w-full sm:w-1/3">
            <input
              type="text"
              placeholder="Buscar aluno..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-full h-10 pl-10 pr-4 rounded-lg border text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all ${inputClass}`}
            />
            <span className="absolute left-3 top-2.5 opacity-50">🔍</span>
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={() => setView(view === 'active' ? 'archived' : 'active')}
              className={`flex-1 sm:flex-none h-10 px-4 rounded-lg text-sm font-medium transition-colors border ${darkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'}`}
            >
              {view === 'active' ? 'Ver Arquivados' : 'Ver Ativos'}
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex-1 sm:flex-none h-10 px-6 rounded-lg text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20 transition-all"
            >
              + Novo Aluno
            </button>
          </div>
        </div>

        {/* Lista de Membros */}
        <div className={`rounded-xl shadow-sm border overflow-hidden ${cardClass}`}>
          <table className="w-full text-sm">
            <thead className={`border-b ${darkMode ? 'bg-gray-800/50 border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
              <tr>
                <th onClick={() => handleSort('name')} className="px-6 py-3 text-left font-semibold cursor-pointer hover:text-orange-500 transition-colors">
                  Aluno {sortCriteria === 'name' && (sortDirection === 'asc' ? '↓' : '↑')}
                </th>
                <th className="px-6 py-3 text-left font-semibold">Plano</th>
                <th onClick={() => handleSort('endDate')} className="px-6 py-3 text-left font-semibold cursor-pointer hover:text-orange-500 transition-colors">
                  Vencimento {sortCriteria === 'endDate' && (sortDirection === 'asc' ? '↓' : '↑')}
                </th>
                <th className="px-6 py-3 text-center font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500">Carregando membros...</td></tr>
              ) : sortedMembers.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())).map(m => {
                const isExpiring = isWithinExpirationRange(m.endDate);
                return (
                  <tr key={m.id} className={`group ${darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'} transition-colors`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base">{m.name}</span>
                        <button onClick={() => openEditModal(m)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-orange-500 transition-opacity p-1" title="Editar dados">✏️</button>
                      </div>
                      <div className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {m.phone || 'Sem telefone'} • {m.email || 'Sem email'}
                      </div>
                      {m.notes && (<div className="mt-1.5 text-xs italic opacity-60 flex items-start gap-1"><span className="text-[10px]">📝</span> {m.notes}</div>)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'}`}>
                        {m.lastPlanName || 'Sem plano'}
                      </span>
                    </td>

                    {/* LÓGICA VISUAL DE VENCIMENTO / INATIVIDADE */}
                    <td className="px-6 py-4">
                      {m.isInactive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-900">
                          INATIVO
                        </span>
                      ) : (
                        <>
                          <span className={`font-medium ${isExpiring ? 'text-red-500 animate-pulse' : (darkMode ? 'text-gray-300' : 'text-gray-700')}`}>
                            {m.endDate || '-'}
                          </span>
                          {isExpiring && <div className="text-[10px] text-red-500 font-bold mt-0.5">VENCE EM BREVE</div>}
                        </>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        {view === 'active' && (
                          <button onClick={() => openRenewModal(m)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-xs font-bold transition-colors shadow-sm">RENOVAR</button>
                        )}
                        <button onClick={() => handleToggleArchiveMember(m)} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${darkMode ? 'border-gray-700 hover:bg-gray-800 text-gray-400' : 'border-gray-300 hover:bg-gray-100 text-gray-600'}`}>
                          {view === 'active' ? 'Arquivar' : 'Reativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!loading && sortedMembers.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500">Nenhum membro encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* --- MODAIS (Create, Edit, Renew) MANTIDOS IDÊNTICOS --- */}
      {(isCreateModalOpen || isRenewModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          {/* Modal Create */}
          {isCreateModalOpen && (
            <div className={`rounded-xl shadow-2xl w-full max-w-md p-6 ${cardClass} border ${darkMode ? 'border-gray-700' : 'border-gray-200'} animate-in fade-in zoom-in duration-200`}>
              <h2 className="text-xl font-bold mb-4">Novo Aluno</h2>
              <form onSubmit={handleCreateMember} className="space-y-4">
                <div><label className="block text-xs font-bold uppercase mb-1 opacity-70">Nome Completo</label><input autoFocus type="text" value={newMemberData.name} onChange={e => setNewMemberData({ ...newMemberData, name: e.target.value })} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`} required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-bold uppercase mb-1 opacity-70">Telefone</label><input type="text" value={newMemberData.phone} onChange={e => setNewMemberData({ ...newMemberData, phone: e.target.value })} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`} /></div>
                  <div><label className="block text-xs font-bold uppercase mb-1 opacity-70">Email</label><input type="email" value={newMemberData.email} onChange={e => setNewMemberData({ ...newMemberData, email: e.target.value })} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`} /></div>
                </div>
                <div><label className="block text-xs font-bold uppercase mb-1 opacity-70">Anotações</label><textarea rows={2} value={newMemberData.customerNotes} onChange={e => setNewMemberData({ ...newMemberData, customerNotes: e.target.value })} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`} /></div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                  <h3 className="text-xs font-bold text-orange-500 uppercase mb-3">Matrícula Inicial</h3>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div><label className="block text-xs font-bold uppercase mb-1 opacity-70">Plano</label><select value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`} required>{plans.map(p => <option key={p.id} value={p.id}>{p.name} - R${p.price}</option>)}</select></div>
                    <div><label className="block text-xs font-bold uppercase mb-1 opacity-70">Pagamento</label><select value={paymentData.method} onChange={e => setPaymentData({ ...paymentData, method: e.target.value })} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`}><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="transferencia">Transf.</option></select></div>
                  </div>
                  <div><label className="block text-xs font-bold uppercase mb-1 opacity-70">Obs. Financeira</label><input type="text" value={paymentData.notes} onChange={e => setPaymentData({ ...paymentData, notes: e.target.value })} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`} placeholder="Ex: Pago parcial..." /></div>
                </div>
                <div className="flex gap-3 pt-2"><button type="button" onClick={() => setIsCreateModalOpen(false)} className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>Cancelar</button><button type="submit" disabled={submitting} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-lg font-bold shadow-lg shadow-orange-500/20">{submitting ? '...' : 'Confirmar'}</button></div>
              </form>
            </div>
          )}

          {/* Modal Edit */}
          {isEditModalOpen && memberToEdit && (
            <div className={`rounded-xl shadow-2xl w-full max-w-md p-6 ${cardClass} border ${darkMode ? 'border-gray-700' : 'border-gray-200'} animate-in fade-in zoom-in duration-200`}>
              <h2 className="text-xl font-bold mb-4">Editar Aluno</h2>
              <form onSubmit={handleUpdateMember} className="space-y-4">
                <div><label className="block text-xs font-bold uppercase mb-1 opacity-70">Nome</label><input type="text" value={memberToEdit.name} onChange={e => setMemberToEdit({ ...memberToEdit, name: e.target.value })} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`} required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-bold uppercase mb-1 opacity-70">Telefone</label><input type="text" value={memberToEdit.phone} onChange={e => setMemberToEdit({ ...memberToEdit, phone: e.target.value })} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`} /></div>
                  <div><label className="block text-xs font-bold uppercase mb-1 opacity-70">Email</label><input type="email" value={memberToEdit.email} onChange={e => setMemberToEdit({ ...memberToEdit, email: e.target.value })} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`} /></div>
                </div>
                <div><label className="block text-xs font-bold uppercase mb-1 opacity-70">Anotações</label><textarea rows={3} value={memberToEdit.notes} onChange={e => setMemberToEdit({ ...memberToEdit, notes: e.target.value })} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`} /></div>
                <div className="flex gap-3 pt-2"><button type="button" onClick={() => setIsEditModalOpen(false)} className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>Cancelar</button><button type="submit" disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold shadow-lg shadow-blue-500/20">{submitting ? '...' : 'Salvar'}</button></div>
              </form>
            </div>
          )}

          {/* Modal Renew */}
          {isRenewModalOpen && memberToRenew && (
            <div className={`rounded-xl shadow-2xl w-full max-w-md p-6 ${cardClass} border ${darkMode ? 'border-gray-700' : 'border-gray-200'} animate-in fade-in zoom-in duration-200`}>
              <h2 className="text-xl font-bold mb-1">Renovar Matrícula</h2>
              <p className="text-sm opacity-70 mb-6">Aluno: <span className="font-bold text-orange-500">{memberToRenew.name}</span></p>
              <form onSubmit={handleConfirmRenew} className="space-y-4">
                <div><label className="block text-xs font-bold uppercase mb-1 opacity-70">Plano</label><select value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`} required>{plans.map(p => <option key={p.id} value={p.id}>{p.name} - R${p.price}</option>)}</select></div>
                <div><label className="block text-xs font-bold uppercase mb-1 opacity-70">Forma de Pagamento</label><select value={paymentData.method} onChange={e => setPaymentData({ ...paymentData, method: e.target.value })} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`}><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="transferencia">Transferência</option></select></div>
                <div><label className="block text-xs font-bold uppercase mb-1 opacity-70">Obs. Financeira</label><input type="text" value={paymentData.notes} onChange={e => setPaymentData({ ...paymentData, notes: e.target.value })} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`} placeholder="Opcional..." /></div>
                <div className="flex gap-3 pt-4"><button type="button" onClick={() => setIsRenewModalOpen(false)} className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>Cancelar</button><button type="submit" disabled={submitting} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-bold shadow-lg shadow-green-500/20">{submitting ? '...' : 'Confirmar & Pagar'}</button></div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}