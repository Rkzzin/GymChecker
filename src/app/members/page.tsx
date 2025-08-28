'use client';

import { useAuthGuard } from '../hooks/useAuth';
import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  collectionGroup,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';

export default function Members() {
  useAuthGuard();
  
  interface Member {
    id: string;
    name: string;
    status: 'active' | 'archived';
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

  interface MemberWithMembership {
    id: string;
    name: string;
    status: 'active' | 'archived';
    startDate: string | null;
    endDate: string | null;
    isInactive: boolean;
  }

  const [members, setMembers] = useState<Member[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [sortedMembers, setSortedMembers] = useState<MemberWithMembership[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortCriteria, setSortCriteria] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [view, setView] = useState<'active' | 'archived'>('active');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMembers();
    fetchMemberships();
  }, [view]);

  useEffect(() => {
    combineMembersWithMemberships();
  }, [members, memberships]);

  const fetchMembers = async () => {
    const q = query(collection(db, 'members'), where('status', '==', view));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(d => ({
      id: d.id,
      name: d.data().name as string,
      status: d.data().status as 'active' | 'archived',
    }));
    setMembers(data);
  };

  const fetchMemberships = async () => {
    const q = await getDocs(collectionGroup(db, 'memberships'));

    const data = q.docs
      .map(d => {
        const dd = d.data();
        let memberId = (dd.memberId as string) ?? null;

        if (!memberId) {
          const parentDoc = d.ref.parent.parent;
          if (parentDoc) {
            memberId = parentDoc.id;
          }
        }

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
      .filter((m): m is Membership => m !== null);

    setMemberships(data);
  };

  const handleAddMember = async (name: string) => {
    const ref = await addDoc(collection(db, 'members'), { name, status: 'active' });
    const newMember = { id: ref.id, name, status: 'active' as const };
    setMembers(prev => [...prev, newMember]);
    handleAddMembership(ref.id);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleAddMembership = async (memberId: string) => {
    const memberMemberships = memberships.filter(m => m.memberId === memberId);
    const sorted = memberMemberships.sort((a, b) => {
      const aDate = new Date(convertDate(a.endDate));
      const bDate = new Date(convertDate(b.endDate));
      return bDate.getTime() - aDate.getTime();
    });
    const lastMembership = sorted[0];

    let newEndDate: Date;
    const start = new Date();

    if (lastMembership) {
      const [lastDay, lastMonth, lastYear] = lastMembership.endDate.split('/').map(Number);
      const lastEndDate = new Date(lastYear, lastMonth - 1, lastDay);
      newEndDate = new Date(lastEndDate);
      newEndDate.setMonth(newEndDate.getMonth() + 1);
    } else {
      newEndDate = new Date(start);
      newEndDate.setDate(newEndDate.getDate() + 30);
    }

    const payload = {
      startDate: Timestamp.fromDate(start),
      endDate: Timestamp.fromDate(newEndDate),
      month: start.getMonth() + 1,
      year: start.getFullYear(),
      paidAmount: 100,
    };

    const ref = await addDoc(
      collection(db, 'members', memberId, 'memberships'),
      payload
    );

    setMemberships(prev => [
      ...prev,
      {
        id: ref.id,
        memberId,
        startDate: start.toLocaleDateString('pt-BR'),
        endDate: newEndDate.toLocaleDateString('pt-BR'),
        month: payload.month,
        year: payload.year,
        paidAmount: payload.paidAmount,
      }
    ]);
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;
    const { id, name } = editingMember;
    await updateDoc(doc(db, 'members', id), { name });
    setMembers(prev =>
      prev.map(m => (m.id === id ? { ...m, name } : m))
    );
    setEditingMember(null);
  };
  
  const handleToggleArchiveMember = async (member: Member) => {
    const newStatus = member.status === 'active' ? 'archived' : 'active';
    const confirmationMessage = newStatus === 'archived' 
        ? `Tem certeza que deseja arquivar ${member.name}?`
        : `Tem certeza que deseja reativar ${member.name}?`;
        
    if (window.confirm(confirmationMessage)) {
        await updateDoc(doc(db, 'members', member.id), { status: newStatus });
        setMembers(prev => prev.filter(m => m.id !== member.id));
    }
  }

  const convertDate = (dateStr: string): string => {
    const [d, m, y] = dateStr.split('/');
    return `${y}-${m}-${d}`;
  };

  const isInactiveMoreThan15Days = (dateStr: string | null) => {
    if (!dateStr) return false;
    const last = new Date(convertDate(dateStr));
    const diff = Math.floor((Date.now() - last.getTime()) / 86400000);
    return diff > 5;
  };

  const isWithinExpirationRange = (endDateStr: string | null): boolean => {
    if (!endDateStr) return false;
    const [day, month, year] = endDateStr.split('/').map(Number);
    const endDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const timeDiff = endDate.getTime() - today.getTime();
    const diffDays = Math.floor(timeDiff / (1000 * 3600 * 24));
    return diffDays >= -5 && diffDays <= 3;
  };

  const combineMembersWithMemberships = () => {
    const combined = members.map(m => {
      const mems = memberships.filter(x => x.memberId === m.id);
      const sortedMems = mems.sort((a, b) => {
        const aDate = new Date(convertDate(a.endDate));
        const bDate = new Date(convertDate(b.endDate));
        return bDate.getTime() - aDate.getTime();
      });
      const last = sortedMems[0] ?? null;
      return {
        ...m,
        startDate: last?.startDate ?? null,
        endDate: last?.endDate ?? null,
        isInactive: isInactiveMoreThan15Days(last?.endDate ?? null)
      };
    });
    setSortedMembers(combined);
  };

  const sortMembers = (field: 'name' | 'startDate' | 'endDate') => {
    const dir = sortDirection === 'asc' ? 1 : -1;
    const sorted = [...sortedMembers].sort((a, b) => {
      if (a.isInactive !== b.isInactive) return a.isInactive ? 1 : -1;
      if (field === 'name') {
        return dir * a.name.localeCompare(b.name);
      }
      const ad = a[field] ? new Date(convertDate(a[field]!)).getTime() : 0;
      const bd = b[field] ? new Date(convertDate(b[field]!)).getTime() : 0;
      return dir * (ad - bd);
    });
    setSortedMembers(sorted);
  };

  const handleSort = (c: 'name' | 'startDate' | 'endDate') => {
    const nextDir = sortCriteria === c && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortCriteria(c);
    setSortDirection(nextDir);
    sortMembers(c);
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const filtered = sortedMembers.filter(m =>
    (m.name ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-black text-white' : 'bg-gray-100 text-gray-900'}`}>
      <header className={`${darkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-200'} border-b`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold">
              <span className="text-orange-500">RLFITNESS</span>
              <span className={darkMode ? 'text-white' : 'text-gray-900'}>|EVOLUTION</span>
            </h1>
          </div>
          <div className="flex items-center space-x-6">
            <nav className="flex space-x-6">
              <a href="/dashboard" className={`${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} font-medium uppercase text-sm`}>Dashboard</a>
              <a href="/members" className="text-orange-500 hover:text-orange-400 font-medium uppercase text-sm">Membros</a>
              <a href="/memberships" className={`${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} font-medium uppercase text-sm`}>Matrículas</a>
            </nav>
            <button 
              onClick={toggleDarkMode} 
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
        {view === 'active' && (
          <section className={`mb-6 rounded-lg shadow-lg p-6 border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>Adicionar Membro</h2>
            <form
              onSubmit={e => {
                e.preventDefault();
                handleAddMember((e.target as any).name.value);
              }}
              className="flex gap-3"
            >
              <input
                name="name"
                ref={inputRef}
                placeholder="Nome do membro"
                className={`border p-3 rounded-md flex-1 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-700 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-md font-medium transition-colors">
                Adicionar
              </button>
            </form>
          </section>
        )}

        <section className={`mb-5 rounded-lg shadow-lg p-6 border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                    Lista de Membros {view === 'active' ? 'Ativos' : 'Arquivados'}
                </h2>
                <button 
                    onClick={() => setView(view === 'active' ? 'archived' : 'active')}
                    className="text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-md"
                >
                    Ver {view === 'active' ? 'Arquivados' : 'Ativos'}
                </button>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar membro..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`border p-2 pl-10 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-700 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <span className="absolute left-3 top-2.5">🔍</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className={`w-full rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
              <thead className={darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-700'}>
                <tr>
                  <th onClick={() => handleSort('name')} className={`p-3 text-left cursor-pointer ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>Nome {sortCriteria === 'name' && (sortDirection === 'asc' ? '↓' : '↑')}</th>
                  <th onClick={() => handleSort('startDate')} className={`p-3 text-left cursor-pointer ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>Último Pagamento {sortCriteria === 'startDate' && (sortDirection === 'asc' ? '↓' : '↑')}</th>
                  <th onClick={() => handleSort('endDate')} className={`p-3 text-left cursor-pointer ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>Vencimento {sortCriteria === 'endDate' && (sortDirection === 'asc' ? '↓' : '↑')}</th>
                  <th className="p-3 text-center">Opções</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const isExpiring = isWithinExpirationRange(m.endDate);
                  return (
                    <tr key={m.id} className={`border-t ${darkMode ? 'border-gray-800 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <td className={`p-3 flex items-center gap-2 ${isExpiring ? 'text-red-500' : ''}`}>
                        {editingMember?.id === m.id ? (
                          <input
                            value={editingMember.name}
                            onChange={e =>
                              setEditingMember({ ...editingMember, name: e.target.value })
                            }
                            className={`border p-1 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                              darkMode 
                                ? 'bg-gray-700 border-gray-600 text-white' 
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          />
                        ) : (
                          <span className="font-medium">{m.name}</span>
                        )}
                        {editingMember?.id === m.id ? (
                          <button 
                            onClick={handleUpdateMember}
                            className="ml-2 bg-orange-600 hover:bg-orange-700 text-white rounded p-1 text-xs"
                          >
                            Salvar
                          </button>
                        ) : (
                          <button 
                            onClick={() => setEditingMember({ id: m.id, name: m.name, status: m.status })}
                            className={`ml-2 rounded p-1 text-xs text-white ${
                              darkMode 
                                ? 'bg-gray-700 hover:bg-gray-600' 
                                : 'bg-gray-400 hover:bg-gray-500'
                            }`}
                          >
                            Editar
                          </button>
                        )}
                      </td>
                      <td className={`p-3 ${isExpiring ? 'text-red-500' : (darkMode ? 'text-gray-300' : 'text-gray-600')}`}>
                        {m.startDate ?? 'Não disponível'}
                      </td>
                      <td className={`p-3 ${
                        m.isInactive 
                          ? 'text-red-500 font-medium' 
                          : (isExpiring ? 'text-red-500' : (darkMode ? 'text-gray-300' : 'text-gray-600'))
                      }`}>
                        {m.isInactive ? 'INATIVO' : m.endDate ?? 'Não disponível'}
                      </td>
                      <td className="p-3 text-center flex items-center justify-center gap-2">
                        {view === 'active' && (
                            <button
                            onClick={() => handleAddMembership(m.id)}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1 rounded transition-colors text-sm font-medium"
                            >
                            Renovar
                            </button>
                        )}
                        <button
                          onClick={() => handleToggleArchiveMember(m)}
                          className={`${view === 'active' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white px-4 py-1 rounded transition-colors text-sm font-medium`}
                        >
                          {view === 'active' ? 'Arquivar' : 'Reativar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className={`p-6 text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Nenhum membro encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className={`border-t py-6 mt-12 ${darkMode ? 'bg-black border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
          <div className="flex space-x-4 mb-2">
            <a href="#" className={darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}>IG</a>
            <a href="#" className={darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}>TW</a>
            <a href="#" className={darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}>FB</a>
          </div>
          <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>© 2025 RLFitness Evolution</p>
        </div>
      </footer>
    </div>
  );
}