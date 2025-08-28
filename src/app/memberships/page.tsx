'use client';

import { useAuthGuard } from '../hooks/useAuth';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
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
  const [loadingMemberships, setLoadingMemberships] = useState<{ [key: string]: boolean }>({});
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
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    fetchMembers();
    
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme !== null) {
      setDarkMode(savedTheme === 'true');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
      document.documentElement.classList.remove('light-mode');
    } else {
      document.documentElement.classList.add('light-mode');
      document.documentElement.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const fetchMembers = async () => {
    const q = await getDocs(collection(db, 'members'));
    const data = q.docs.map(d => ({
      id: d.id,
      name: d.data().name as string,
    }));
    setMembers(data);
  };

  const fetchMembershipsForMember = async (memberId: string) => {
    setLoadingMemberships(prev => ({ ...prev, [memberId]: true }));
    try {
        const membershipsCollectionRef = collection(db, 'members', memberId, 'memberships');
        const q = await getDocs(membershipsCollectionRef);

        const data = q.docs.map(d => {
            const dd = d.data();
            return {
            id: d.id,
            memberId,
            startDate: dd.startDate.toDate().toLocaleDateString('pt-BR'),
            endDate: dd.endDate.toDate().toLocaleDateString('pt-BR'),
            month: dd.month,
            year: dd.year,
            paidAmount: dd.paidAmount
            } as Membership;
        });

        setMemberships(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMemberships = data.filter(m => !existingIds.has(m.id));
            return [...prev, ...newMemberships];
        });
    } catch (error) {
        console.error("Error fetching memberships for member:", error);
    } finally {
        setLoadingMemberships(prev => ({ ...prev, [memberId]: false }));
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleMemberships = (memberId: string) => {
    const isOpening = !openMemberships[memberId];
    
    const memberHasMembershipsLoaded = memberships.some(m => m.memberId === memberId);
    if (isOpening && !memberHasMembershipsLoaded) {
      fetchMembershipsForMember(memberId);
    }

    setOpenMemberships(prevState => ({
      ...prevState,
      [memberId]: isOpening
    }));
  };

  const toggleAllMemberships = async () => {
      const nextAllOpen = !allOpen;
      setAllOpen(nextAllOpen);
  
      const newState: { [key: string]: boolean } = {};
      
      if (nextAllOpen) {
          const promises = filteredMembers
              .filter(member => !memberships.some(m => m.memberId === member.id))
              .map(member => fetchMembershipsForMember(member.id));
          
          await Promise.all(promises);
      }
  
      filteredMembers.forEach(member => {
          newState[member.id] = nextAllOpen;
      });
      setOpenMemberships(newState);
  };

  const handleEditMembership = (membership: Membership) => {
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
      const [startYear, startMonth, startDay] = editingMembership.startDate.split('-').map(Number);
      const newStartDate = new Date(startYear, startMonth - 1, startDay);

      const [endYear, endMonth, endDay] = editingMembership.endDate.split('-').map(Number);
      const newEndDate = new Date(endYear, endMonth - 1, endDay);

      const membershipRef = doc(db, 'members', editingMembership.memberId, 'memberships', editingMembership.id);
      await updateDoc(membershipRef, {
        startDate: Timestamp.fromDate(newStartDate),
        endDate: Timestamp.fromDate(newEndDate),
        paidAmount: editingMembership.paidAmount
      });

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
      const membershipRef = doc(db, 'members', deletingMembership.memberId, 'memberships', deletingMembership.id);
      await deleteDoc(membershipRef);

      setMemberships(prev => prev.filter(m => m.id !== deletingMembership.id));

      setDeletingMembership(null);
    } catch (error) {
      console.error('Erro ao excluir a matrícula:', error);
    }
  };

  const sortMemberships = (memberships: Membership[]) => {
    return [...memberships].sort((a, b) => {
      const dateA = a.startDate.split('/').reverse().join('-');
      const dateB = b.startDate.split('/').reverse().join('-');
      return dateB.localeCompare(dateA);
    });
  };

  const bgClass = darkMode ? 'bg-black' : 'bg-gray-100';
  const textClass = darkMode ? 'text-white' : 'text-gray-900';
  const borderClass = darkMode ? 'border-gray-800' : 'border-gray-300';
  const headerBgClass = darkMode ? 'bg-black' : 'bg-white';
  const cardBgClass = darkMode ? 'bg-gray-900' : 'bg-white';
  const tableBgClass = darkMode ? 'bg-gray-900' : 'bg-white';
  const tableHeaderBgClass = darkMode ? 'bg-gray-800' : 'bg-gray-200';
  const tableHeaderTextClass = darkMode ? 'text-gray-300' : 'text-gray-700';
  const inputBgClass = darkMode ? 'bg-gray-800' : 'bg-white';
  const inputBorderClass = darkMode ? 'border-gray-700' : 'border-gray-300';
  const linkTextClass = darkMode ? 'text-gray-300' : 'text-gray-600';
  const footerTextClass = darkMode ? 'text-gray-500' : 'text-gray-500';
  const hoverBgClass = darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100';

  return (
    <div className={`min-h-screen ${bgClass} ${textClass}`}>
      <header className={`${headerBgClass} border-b ${borderClass}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold">
              <span className="text-orange-500">RLFITNESS</span>
              <span className={textClass}>|EVOLUTION</span>
            </h1>
          </div>
          
          <div className="flex items-center space-x-6">
            <nav className="flex space-x-6">
              <a href="/dashboard" className={`${linkTextClass} hover:text-orange-500 font-medium uppercase text-sm`}>Dashboard</a>
              <a href="/members" className={`${linkTextClass} hover:text-orange-500 font-medium uppercase text-sm`}>Membros</a>
              <a href="/memberships" className="text-orange-500 hover:text-orange-400 font-medium uppercase text-sm">Matrículas</a>
            </nav>
            
            <button 
              onClick={toggleTheme} 
              className={`p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'}`}
              title={darkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            >
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className={`mb-6 ${cardBgClass} p-6 rounded-lg shadow-lg border ${borderClass}`}>
          <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>Alunos</h2>
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Buscar aluno..."
                className={`w-full ${inputBgClass} border ${inputBorderClass} p-3 rounded-md ${textClass} focus:outline-none focus:ring-2 focus:ring-orange-500 pl-10`}
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
            <div key={member.id} className={`mb-4 ${cardBgClass} p-6 rounded-lg shadow-lg border ${borderClass}`}>
              <div className="flex justify-between items-center">
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{member.name}</h3>
                <button
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1 rounded-md font-medium transition-colors text-sm"
                  onClick={() => toggleMemberships(member.id)}
                  disabled={loadingMemberships[member.id]}
                >
                    {loadingMemberships[member.id] ? 'Carregando...' : (openMemberships[member.id] ? 'Fechar' : 'Abrir')}
                </button>
              </div>
              {openMemberships[member.id] && !loadingMemberships[member.id] && (
                <div className="mt-4 overflow-x-auto">
                  <table className={`w-full ${tableBgClass} rounded-lg`}>
                    <thead className={`${tableHeaderBgClass} ${tableHeaderTextClass}`}>
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
                        <tr key={membership.id} className={`border-t ${borderClass} ${hoverBgClass}`}>
                          <td className={`p-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{membership.id.substring(0, 6)}...</td>
                          <td className={`p-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {editingMembership && editingMembership.id === membership.id ? (
                              <input
                                type="date"
                                value={editingMembership.startDate}
                                onChange={e => setEditingMembership({ ...editingMembership, startDate: e.target.value })}
                                className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} border p-1 rounded ${textClass} focus:outline-none focus:ring-2 focus:ring-orange-500`}
                              />
                            ) : (
                              membership.startDate
                            )}
                          </td>
                          <td className={`p-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {editingMembership && editingMembership.id === membership.id ? (
                              <input
                                type="date"
                                value={editingMembership.endDate}
                                onChange={e => setEditingMembership({ ...editingMembership, endDate: e.target.value })}
                                className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} border p-1 rounded ${textClass} focus:outline-none focus:ring-2 focus:ring-orange-500`}
                              />
                            ) : (
                              membership.endDate
                            )}
                          </td>
                          <td className={`p-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {editingMembership && editingMembership.id === membership.id ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editingMembership.paidAmount}
                                onChange={e => setEditingMembership({ ...editingMembership, paidAmount: parseFloat(e.target.value) })}
                                className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} border p-1 rounded ${textClass} focus:outline-none focus:ring-2 focus:ring-orange-500 w-24`}
                              />
                            ) : (
                              `R$ ${membership.paidAmount.toFixed(2)}`
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {editingMembership && editingMembership.id === membership.id ? (
                              <button
                                onClick={handleUpdateMembership}
                                className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} text-${darkMode ? 'white' : 'gray-800'} rounded p-1 text-sm`}
                                title="Salvar alterações"
                              >
                                ✔️
                              </button>
                            ) : deletingMembership && deletingMembership.id === membership.id ? (
                              <>
                                <button
                                  onClick={handleDeleteMembership}
                                  className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} text-${darkMode ? 'white' : 'gray-800'} rounded p-1 text-sm`}
                                  title="Confirmar exclusão"
                                >
                                  ✔️
                                </button>
                                <button
                                  onClick={() => setDeletingMembership(null)}
                                  className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} text-${darkMode ? 'white' : 'gray-800'} rounded p-1 text-sm ml-2`}
                                  title="Cancelar"
                                >
                                  ❌
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEditMembership(membership)}
                                  className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} text-${darkMode ? 'white' : 'gray-800'} rounded p-1 text-sm`}
                                  title="Editar matrícula"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => setDeletingMembership({ id: membership.id, memberId: membership.memberId })}
                                  className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} text-${darkMode ? 'white' : 'gray-800'} rounded p-1 text-sm ml-2`}
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
            <div className={`p-6 text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'} ${cardBgClass} rounded-lg shadow-lg border ${borderClass}`}>
              Nenhum membro encontrado com esse critério de busca.
            </div>
          )}
        </div>
      </main>

      <footer className={`${headerBgClass} border-t ${borderClass} py-6 mt-12`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
          <div className="flex space-x-4 mb-2">
            <a href="#" className={footerTextClass + " hover:text-orange-500"}>IG</a>
            <a href="#" className={footerTextClass + " hover:text-orange-500"}>TW</a>
            <a href="#" className={footerTextClass + " hover:text-orange-500"}>FB</a>
          </div>
          <p className="text-sm text-gray-500">© 2025 RLFitness Evolution</p>
        </div>
      </footer>

      <style jsx global>{`
        .dark-mode {
          color-scheme: dark;
        }
        .light-mode {
          color-scheme: light;
        }
      `}</style>
    </div>
  );
}