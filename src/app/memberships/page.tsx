'use client';

import { useAuthGuard } from '../hooks/useAuth';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  collectionGroup,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';

export default function Memberships() {
  useAuthGuard();

  interface Member {
    id: string;
    name: string;
  }

  interface Membership {
    id: string;
    memberId: string;
    startDate: string;
    endDate: string;
    month: number;
    year: number;
    paidAmount: number;
  }

  const [members, setMembers] = useState<Member[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMemberships, setOpenMemberships] = useState<{ [key: string]: boolean }>({});
  const [allOpen, setAllOpen] = useState(false);
  const [editingMembership, setEditingMembership] = useState<{
    id: string,
    memberId: string,
    startDate: string,
    endDate: string,
    paidAmount: number
  } | null>(null);
  const [deletingMembership, setDeletingMembership] = useState<{
    id: string,
    memberId: string
  } | null>(null);

  useEffect(() => {
    fetchMembers();
    fetchMemberships();
  }, []);

  // 1) CARREGA MEMBROS
  const fetchMembers = async () => {
    const q = await getDocs(collection(db, 'members'));
    const data = q.docs.map(d => ({
      id: d.id,
      name: d.data().name as string,
    }));
    setMembers(data);
  };

  // 2) CARREGA TODAS AS MEMBERSHIPS de todos os membros
  const fetchMemberships = async () => {
    const q = await getDocs(collectionGroup(db, 'memberships'));

    const data = q.docs
      .map(d => {
        const dd = d.data();

        // 1 primeiro tenta pegar memberId direto do payload (se você tiver)
        let memberId = (dd.memberId as string) ?? null;

        // 2 se não tiver no payload, tenta extrair do path
        if (!memberId) {
          const parentDoc = d.ref.parent.parent;
          if (parentDoc) {
            memberId = parentDoc.id;
          }
        }

        // 3 se ainda não achou memberId, pula este doc
        if (!memberId) {
          console.warn(`Pulando ${d.ref.path} sem memberId`);
          return null;
        }

        return {
          id: d.id,
          memberId,
          startDate: dd.startDate.toDate().toLocaleDateString('pt-BR'),
          endDate: dd.endDate.toDate().toLocaleDateString('pt-BR'),
          month: dd.month,
          year: dd.year,
          paidAmount: dd.paidAmount
        } as Membership;
      })
      // filtra só os não-nulos
      .filter((m): m is Membership => m !== null);

    setMemberships(data);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleMemberships = (memberId: string) => {
    setOpenMemberships(prevState => ({
      ...prevState,
      [memberId]: !prevState[memberId]
    }));
  };

  const toggleAllMemberships = () => {
    setAllOpen(!allOpen);
    const newState: { [key: string]: boolean } = {};
    filteredMembers.forEach(member => {
      newState[member.id] = !allOpen;
    });
    setOpenMemberships(newState);
  };

  const handleEditMembership = (membership: Membership) => {
    // Converter as datas no formato PT-BR para o formato YYYY-MM-DD para o input date
    const startDateParts = membership.startDate.split('/');
    const formattedStartDate = `${startDateParts[2]}-${startDateParts[1].padStart(2, '0')}-${startDateParts[0].padStart(2, '0')}`;

    const endDateParts = membership.endDate.split('/');
    const formattedEndDate = `${endDateParts[2]}-${endDateParts[1].padStart(2, '0')}-${endDateParts[0].padStart(2, '0')}`;

    setEditingMembership({
      id: membership.id,
      memberId: membership.memberId,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      paidAmount: membership.paidAmount
    });
  };

  const handleUpdateMembership = async () => {
    if (!editingMembership) return;

    try {
      // Converter as datas de YYYY-MM-DD para objetos Date
      const [startYear, startMonth, startDay] = editingMembership.startDate.split('-').map(Number);
      const newStartDate = new Date(startYear, startMonth - 1, startDay);

      const [endYear, endMonth, endDay] = editingMembership.endDate.split('-').map(Number);
      const newEndDate = new Date(endYear, endMonth - 1, endDay);

      // Atualizar no Firestore
      const membershipRef = doc(db, 'members', editingMembership.memberId, 'memberships', editingMembership.id);
      await updateDoc(membershipRef, {
        startDate: Timestamp.fromDate(newStartDate),
        endDate: Timestamp.fromDate(newEndDate),
        paidAmount: editingMembership.paidAmount
      });

      // Atualizar no state local
      setMemberships(prev =>
        prev.map(m =>
          m.id === editingMembership.id
            ? {
              ...m,
              startDate: newStartDate.toLocaleDateString('pt-BR'),
              endDate: newEndDate.toLocaleDateString('pt-BR'),
              paidAmount: editingMembership.paidAmount
            }
            : m
        )
      );

      setEditingMembership(null);
    } catch (error) {
      console.error('Erro ao atualizar a matrícula:', error);
    }
  };

  const handleDeleteMembership = async () => {
    if (!deletingMembership) return;

    try {
      // Excluir do Firestore
      const membershipRef = doc(db, 'members', deletingMembership.memberId, 'memberships', deletingMembership.id);
      await deleteDoc(membershipRef);

      // Remover do state local
      setMemberships(prev => prev.filter(m => m.id !== deletingMembership.id));

      setDeletingMembership(null);
    } catch (error) {
      console.error('Erro ao excluir a matrícula:', error);
    }
  };

  // Função para ordenar memberships por data de início (mais recente primeiro)
  const sortMemberships = (memberships: Membership[]) => {
    return [...memberships].sort((a, b) => {
      const dateA = a.startDate.split('/').reverse().join('-');
      const dateB = b.startDate.split('/').reverse().join('-');
      return dateB.localeCompare(dateA);
    });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="bg-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold">
              <span className="text-orange-500">RLFITNESS</span>
              <span className="text-white">|EVOLUTION</span>
            </h1>
          </div>
          <nav className="flex space-x-6">
            <a href="/dashboard" className="text-gray-300 hover:text-white font-medium uppercase text-sm">Dashboard</a>
            <a href="/members" className="text-gray-300 hover:text-white font-medium uppercase text-sm">Membros</a>
            <a href="/memberships" className="text-orange-500 hover:text-orange-400 font-medium uppercase text-sm">Matrículas</a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 bg-gray-900 p-6 rounded-lg shadow-lg border border-gray-800">
          <h2 className="text-xl font-semibold mb-4 text-gray-100">Alunos</h2>
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Buscar aluno..."
                className="w-full bg-gray-800 border border-gray-700 p-3 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500 pl-10"
                value={searchQuery}
                onChange={handleSearch}
              />
              <span className="absolute left-3 top-3">🔍</span>
            </div>
            <button
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-md font-medium transition-colors"
              onClick={toggleAllMemberships}
            >
              {allOpen ? 'Fechar Todas' : 'Abrir Todas'}
            </button>
          </div>
        </div>

        <div className="mb-5">
          {filteredMembers.map(member => (
            <div key={member.id} className="mb-4 bg-gray-900 p-6 rounded-lg shadow-lg border border-gray-800">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-100">{member.name}</h3>
                <button
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1 rounded-md font-medium transition-colors text-sm"
                  onClick={() => toggleMemberships(member.id)}
                >
                  {openMemberships[member.id] ? 'Fechar' : 'Abrir'}
                </button>
              </div>
              {openMemberships[member.id] && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full bg-gray-900 rounded-lg">
                    <thead className="bg-gray-800 text-gray-300">
                      <tr>
                        <th className="p-3 text-left">ID</th>
                        <th className="p-3 text-left">Pagamento</th>
                        <th className="p-3 text-left">Vencimento</th>
                        <th className="p-3 text-left">Valor</th>
                        <th className="p-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortMemberships(memberships.filter(m => m.memberId === member.id)).map(membership => (
                        <tr key={membership.id} className="border-t border-gray-800 hover:bg-gray-800">
                          <td className="p-3 text-gray-300">{membership.id.substring(0, 6)}...</td>
                          <td className="p-3 text-gray-300">
                            {editingMembership && editingMembership.id === membership.id ? (
                              <input
                                type="date"
                                value={editingMembership.startDate}
                                onChange={e => setEditingMembership({ ...editingMembership, startDate: e.target.value })}
                                className="bg-gray-700 border border-gray-600 p-1 rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            ) : (
                              membership.startDate
                            )}
                          </td>
                          <td className="p-3 text-gray-300">
                            {editingMembership && editingMembership.id === membership.id ? (
                              <input
                                type="date"
                                value={editingMembership.endDate}
                                onChange={e => setEditingMembership({ ...editingMembership, endDate: e.target.value })}
                                className="bg-gray-700 border border-gray-600 p-1 rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            ) : (
                              membership.endDate
                            )}
                          </td>
                          <td className="p-3 text-gray-300">
                            {editingMembership && editingMembership.id === membership.id ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editingMembership.paidAmount}
                                onChange={e => setEditingMembership({ ...editingMembership, paidAmount: parseFloat(e.target.value) })}
                                className="bg-gray-700 border border-gray-600 p-1 rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500 w-24"
                              />
                            ) : (
                              `R$ ${membership.paidAmount.toFixed(2)}`
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {editingMembership && editingMembership.id === membership.id ? (
                              <button
                                onClick={handleUpdateMembership}
                                className="bg-gray-700 hover:bg-gray-600 text-white rounded p-1 text-sm"
                                title="Salvar alterações"
                              >
                                ✔️
                              </button>
                            ) : deletingMembership && deletingMembership.id === membership.id ? (
                              <>
                                <button
                                  onClick={handleDeleteMembership}
                                  className="bg-gray-700 hover:bg-gray-600 text-white rounded p-1 text-sm"
                                  title="Confirmar exclusão"
                                >
                                  ✔️
                                </button>
                                <button
                                  onClick={() => setDeletingMembership(null)}
                                  className="bg-gray-700 hover:bg-gray-600 text-white rounded p-1 text-sm ml-2"
                                  title="Cancelar"
                                >
                                  ❌
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEditMembership(membership)}
                                  className="bg-gray-700 hover:bg-gray-600 text-white rounded p-1 text-sm"
                                  title="Editar matrícula"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => setDeletingMembership({ id: membership.id, memberId: membership.memberId })}
                                  className="bg-gray-700 hover:bg-gray-600 text-white rounded p-1 text-sm ml-2"
                                  title="Excluir matrícula"
                                >
                                  🗑️
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
          {filteredMembers.length === 0 && (
            <div className="p-6 text-center text-gray-500 bg-gray-900 rounded-lg shadow-lg border border-gray-800">
              Nenhum membro encontrado com esse critério de busca.
            </div>
          )}
        </div>
      </main>

      <footer className="bg-black border-t border-gray-800 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
          <div className="flex space-x-4 mb-2">
            <a href="#" className="text-gray-400 hover:text-white">IG</a>
            <a href="#" className="text-gray-400 hover:text-white">TW</a>
            <a href="#" className="text-gray-400 hover:text-white">FB</a>
          </div>
          <p className="text-sm text-gray-500">© 2025 RLFitness Evolution</p>
        </div>
      </footer>
    </div>
  );
}