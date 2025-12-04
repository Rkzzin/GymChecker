'use client';

import { useAuthGuard } from '../hooks/useAuth';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Interfaces
interface Member {
  id: string;
  name: string;
}

interface Membership {
  id: string;
  memberId: string;
  startDate: string; // Formatado para exibição
  endDate: string;   // Formatado para exibição
  rawStartDate: string; // ISO para edição
  rawEndDate: string;   // ISO para edição
  planName: string;
  price: number;
}

export default function Memberships() {
  useAuthGuard();

  const [members, setMembers] = useState<Member[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMemberships, setOpenMemberships] = useState<{ [key: string]: boolean }>({});
  const [loadingMemberships, setLoadingMemberships] = useState<{ [key: string]: boolean }>({});
  const [darkMode, setDarkMode] = useState(false);

  // Estados de Edição
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [membershipToEdit, setMembershipToEdit] = useState<{
    id: string;
    memberId: string; // Para recarregar a lista certa depois
    startDate: string;
    endDate: string;
    memberName: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // --- Efeitos ---
  useEffect(() => {
    fetchMembers();
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme !== null) setDarkMode(savedTheme === 'true');
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  // --- Buscas ---
  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('customer')
        .select('id, name')
        .order('name');

      if (error) throw error;
      if (data) setMembers(data);
    } catch (error) {
      console.error("Erro ao buscar membros:", error);
    }
  };

  const fetchMembershipsForMember = async (memberId: string) => {
    setLoadingMemberships(prev => ({ ...prev, [memberId]: true }));
    try {
      const { data, error } = await supabase
        .from('subscription')
        .select(`
            *,
            plan (name, price)
          `)
        .eq('customer_id', memberId)
        .order('end_date', { ascending: false });

      if (error) throw error;

      const mappedData = (data || []).map((sub: any) => ({
        id: sub.id,
        memberId: sub.customer_id,
        startDate: new Date(sub.start_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
        endDate: new Date(sub.end_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
        rawStartDate: sub.start_date, // Importante para o input type="date"
        rawEndDate: sub.end_date,     // Importante para o input type="date"
        planName: sub.plan?.name || 'Personalizado',
        price: sub.plan?.price || 0
      } as Membership));

      setMemberships(prev => {
        const others = prev.filter(m => m.memberId !== memberId);
        return [...others, ...mappedData];
      });
    } catch (error) {
      console.error("Error fetching memberships:", error);
    } finally {
      setLoadingMemberships(prev => ({ ...prev, [memberId]: false }));
    }
  };

  // --- Ações ---
  const toggleMemberships = (memberId: string) => {
    const isOpening = !openMemberships[memberId];
    if (isOpening) fetchMembershipsForMember(memberId);
    setOpenMemberships(prev => ({ ...prev, [memberId]: isOpening }));
  };

  const openEditModal = (membership: Membership, memberName: string) => {
    setMembershipToEdit({
      id: membership.id,
      memberId: membership.memberId,
      // Converte ISO (YYYY-MM-DDT...) para YYYY-MM-DD
      startDate: new Date(membership.rawStartDate).toISOString().split('T')[0],
      endDate: new Date(membership.rawEndDate).toISOString().split('T')[0],
      memberName: memberName
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!membershipToEdit) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('subscription')
        .update({
          start_date: membershipToEdit.startDate,
          end_date: membershipToEdit.endDate
        })
        .eq('id', membershipToEdit.id);

      if (error) throw error;

      // Sucesso: fecha modal e recarrega a lista específica
      setIsEditModalOpen(false);
      await fetchMembershipsForMember(membershipToEdit.memberId);
      setMembershipToEdit(null);

    } catch (error: any) {
      alert('Erro ao atualizar datas: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMembership = async (id: string, memberId: string) => {
    if (!confirm("Tem certeza que deseja excluir este registro de matrícula?")) return;

    try {
      const { error } = await supabase.from('subscription').delete().eq('id', id);
      if (error) throw error;
      setMemberships(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir matrícula.');
    }
  };

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- Estilos ---
  const bgClass = darkMode ? 'bg-black text-gray-100' : 'bg-gray-50 text-gray-900';
  const cardClass = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const headerClass = darkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-200';
  const linkClass = darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900';
  const inputClass = darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900';

  return (
    <div className={`min-h-screen ${bgClass} transition-colors duration-300`}>
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
            <a href="/members" className={`${linkClass} font-medium text-sm transition-colors`}>Membros</a>
            <a href="/memberships" className="text-orange-500 font-semibold text-sm">Matrículas</a>
            <a href="/plans" className={`${linkClass} font-medium text-sm transition-colors`}>Planos</a>
            <a href="/payments" className={`${linkClass} font-medium text-sm transition-colors`}>Financeiro</a>
          </nav>

          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-full transition-colors ${darkMode ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {darkMode ? '☀' : '☾'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

        {/* Filtro e Título */}
        <div className={`mb-6 p-4 rounded-xl shadow-sm border ${cardClass}`}>
          <h2 className="text-xl font-bold mb-4">Histórico de Matrículas</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar histórico de aluno..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-full h-11 pl-10 pr-4 rounded-lg border text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all ${inputClass}`}
            />
            <span className="absolute left-3 top-3 opacity-50">🔍</span>
          </div>
        </div>

        {/* Lista de Alunos e Histórico */}
        <div className="space-y-4">
          {filteredMembers.map(member => (
            <div key={member.id} className={`rounded-xl shadow-sm border overflow-hidden ${cardClass}`}>
              {/* Cabeçalho do Aluno */}
              <div className={`p-4 flex justify-between items-center transition-colors ${darkMode ? 'bg-gray-800/30' : 'bg-gray-50'}`}>
                <h3 className="text-lg font-semibold">{member.name}</h3>
                <button
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${openMemberships[member.id]
                      ? (darkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300')
                      : 'bg-orange-600 text-white hover:bg-orange-700 shadow-md shadow-orange-500/20'
                    }`}
                  onClick={() => toggleMemberships(member.id)}
                  disabled={loadingMemberships[member.id]}
                >
                  {loadingMemberships[member.id] ? 'Carregando...' : (openMemberships[member.id] ? 'Fechar Histórico' : 'Ver Histórico')}
                </button>
              </div>

              {/* Tabela de Histórico (Expansível) */}
              {openMemberships[member.id] && !loadingMemberships[member.id] && (
                <div className="border-t border-gray-100 dark:border-gray-800 animate-in slide-in-from-top-2 duration-200">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className={`border-b ${darkMode ? 'bg-gray-800/50 border-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                        <tr>
                          <th className="px-6 py-3 text-left font-semibold">Plano</th>
                          <th className="px-6 py-3 text-left font-semibold">Início</th>
                          <th className="px-6 py-3 text-left font-semibold">Fim</th>
                          <th className="px-6 py-3 text-left font-semibold">Valor (Ref)</th>
                          <th className="px-6 py-3 text-center font-semibold">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {memberships.filter(m => m.memberId === member.id).map(membership => (
                          <tr key={membership.id} className={`group ${darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'} transition-colors`}>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'
                                }`}>
                                {membership.planName}
                              </span>
                            </td>
                            <td className="px-6 py-4 opacity-80">{membership.startDate}</td>
                            <td className="px-6 py-4 font-medium">{membership.endDate}</td>
                            <td className="px-6 py-4 opacity-80">R$ {membership.price.toFixed(2)}</td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex justify-center gap-3">
                                <button
                                  onClick={() => openEditModal(membership, member.name)}
                                  className="text-gray-400 hover:text-blue-500 p-1 transition-colors"
                                  title="Editar datas"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleDeleteMembership(membership.id, member.id)}
                                  className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                                  title="Excluir este registro"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {memberships.filter(m => m.memberId === member.id).length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center opacity-50 italic">
                              Nenhum histórico de matrícula encontrado para este aluno.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}

          {!loadingMemberships && filteredMembers.length === 0 && (
            <div className={`p-8 text-center opacity-50 ${cardClass} rounded-xl border`}>
              Nenhum aluno encontrado com este nome.
            </div>
          )}
        </div>
      </main>

      {/* MODAL DE EDIÇÃO DE DATAS */}
      {isEditModalOpen && membershipToEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all">
          <div className={`rounded-xl shadow-2xl w-full max-w-md p-6 ${cardClass} border ${darkMode ? 'border-gray-700' : 'border-gray-200'} animate-in zoom-in-95 duration-200`}>
            <div className="mb-6">
              <h2 className="text-xl font-bold">Editar Vigência</h2>
              <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Aluno: <span className="font-medium text-orange-500">{membershipToEdit.memberName}</span>
              </p>
            </div>

            <form onSubmit={handleUpdateMembership} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1.5 opacity-70">Data de Início</label>
                  <input
                    type="date"
                    value={membershipToEdit.startDate}
                    onChange={e => setMembershipToEdit({ ...membershipToEdit, startDate: e.target.value })}
                    className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${inputClass}`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1.5 opacity-70">Data de Fim</label>
                  <input
                    type="date"
                    value={membershipToEdit.endDate}
                    onChange={e => setMembershipToEdit({ ...membershipToEdit, endDate: e.target.value })}
                    className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${inputClass}`}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}