'use client';

import React, { useState, useEffect, useRef } from 'react';

const Members = () => {
  interface Member {
    id: number;
    name: string;
  }

  interface Membership {
    id: number;
    memberId: number;
    startDate: string;
    endDate: string;
    month: number;
    year: number;
  }

  interface MemberWithMembership {
    id: number;
    name: string;
    startDate: string | null;
    endDate: string | null;
    isInactive: boolean;
  }

  const [members, setMembers] = useState<Member[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [sortedMembers, setSortedMembers] = useState<MemberWithMembership[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortCriteria, setSortCriteria] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<string>('asc');
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMembers();
    fetchMemberships();
  }, []);

  useEffect(() => {
    combineMembersWithMemberships();
  }, [members, memberships]);

  const fetchMembers = async () => {
    const response = await fetch('http://localhost:5000/members');
    const data = await response.json();
    setMembers(data);
  };

  const fetchMemberships = async () => {
    const response = await fetch('http://localhost:5000/memberships');
    const data = await response.json();
    setMemberships(data);
  };

  const handleAddMember = async (name: string) => {
    const response = await fetch('http://localhost:5000/create_member', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name })
    });

    const data = await response.json();
    setMembers([...members, data]);

    const memberId = data.id;
    handleAddMembership(memberId);
    if (inputRef.current) {
      inputRef.current.value = ''; // Clear input value
    }
  };

  const handleAddMembership = async (memberId: number) => {
    const response = await fetch('http://localhost:5000/create_membership', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ memberId })
    });

    const data = await response.json();
    setMemberships([...memberships, data]);
  };

  const convertDate = (dateStr: string): string => {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  };

  const isInactiveMoreThan15Days = (dateStr: string | null): boolean => {
    if (!dateStr) return false;
    const date = new Date(convertDate(dateStr));
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset hours to compare only dates
    const differenceInDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return differenceInDays > 15;
  };

  const combineMembersWithMemberships = () => {
    const combined: MemberWithMembership[] = members.map(member => {
      // Filter member memberships
      const memberMemberships = memberships.filter(m => m.memberId === member.id);

      // Find the latest membership
      const latestMembership = memberMemberships.reduce((latest, current) => {
        return current.id > latest.id ? current : latest;
      }, memberMemberships[0]);

      const isInactive = latestMembership ? isInactiveMoreThan15Days(latestMembership.endDate) : false;

      return {
        ...member,
        startDate: latestMembership ? latestMembership.startDate : null,
        endDate: latestMembership ? latestMembership.endDate : null,
        isInactive
      };
    });

    setSortedMembers(combined);
  };

  const sortMembers = (criteria: string) => {
    const sorted = [...sortedMembers].sort((a, b) => {
      if (a.isInactive && !b.isInactive) return 1;
      if (!a.isInactive && b.isInactive) return -1;

      if (criteria === 'name') {
        return sortDirection === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (criteria === 'startDate' || criteria === 'endDate') {
        const aDate = a[criteria] ? new Date(convertDate(a[criteria] as string)) : new Date(0);
        const bDate = b[criteria] ? new Date(convertDate(b[criteria] as string)) : new Date(0);
        return sortDirection === 'asc'
          ? aDate.getTime() - bDate.getTime()
          : bDate.getTime() - aDate.getTime();
      }
      return 0;
    });

    setSortedMembers(sorted);
  };

  const handleSort = (criteria: string) => {
    const newSortOrder = sortCriteria === criteria && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortCriteria(criteria);
    setSortDirection(newSortOrder);
    sortMembers(criteria);
  };

  const handleEditMember = (member: Member) => {
    setEditingMember(member);
  };

  const handleUpdateMember = async () => {
    if (editingMember) {
      const response = await fetch(`http://localhost:5000/update_member/${editingMember.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: editingMember.name })
      });

      if (response.ok) {
        const updatedMember = await response.json();
        setMembers(members.map(m => (m.id === updatedMember.id ? updatedMember : m)));
        setEditingMember(null);
      } else {
        const errorData = await response.json();
        console.error(errorData.error);
      }
    }
  };

  const isPastToday = (dateStr: string | null): boolean => {
    if (!dateStr) return false;
    const date = new Date(convertDate(dateStr));
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset hours to compare only dates
    return date < today;
  };

  const filteredMembers = sortedMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <header className="flex items-center bg-white shadow">
        <img src="https://i.etsystatic.com/18154652/r/il/e4903a/1723732632/il_fullxfull.1723732632_mqzc.jpg" alt="" className="w-28 absolute left-4" />
        <div className="py-6 px-36">
          <h1 className="text-3xl font-bold leading-tight text-gray-900">Membros</h1>
          <nav className="mt-4">
            <a href="/dashboard" className="text-blue-600 hover:text-blue-800 mr-4">Painel</a>
            <a href="/members" className="font-bold text-blue-600 hover:text-blue-800 mr-4">Membros</a>
            <a href="/memberships" className="text-blue-600 hover:text-blue-800 mr-4">Matrículas</a>
            <a href="/" className="text-blue-600 hover:text-blue-800">Logout</a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 text-gray-900">
        <section className="w-full mb-5">
          <h2 className="mb-1 text-xl font-semibold">Adicionar Membro</h2>
          <form
            onSubmit={event => {
              event.preventDefault();
              const formData = new FormData(event.target as HTMLFormElement);
              handleAddMember(formData.get('name') as string);
            }}
            className="w-full flex items-center justify-center"
          >
            <input
              ref={inputRef}
              name="name"
              type="text"
              placeholder="Nome"
              className="w-full mr-8 border border-gray-300 rounded-md p-2"
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 active:bg-blue-900 text-white font-bold py-2 px-4 rounded"
            >
              Adicionar
            </button>
          </form>
        </section>

        <table className="w-full">
          <thead className="bg-gray-200">
            <tr>
              <th scope="col" className="pl-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th
                scope="col"
                className="pr-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('name')}
              >
                Nome {sortCriteria === 'name' && (sortDirection === 'asc' ? '↓' : '↑')}
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('startDate')}
              >
                Pagamento {sortCriteria === 'startDate' && (sortDirection === 'asc' ? '↓' : '↑')}
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('endDate')}
              >
                Vencimento {sortCriteria === 'endDate' && (sortDirection === 'asc' ? '↓' : '↑')}
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                Opções
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {filteredMembers.map(member => (
              <tr key={member.id}>
                <td className="pl-6 py-2 whitespace-nowrap text-sm text-gray-500">
                  {member.id}
                </td>
                <td className="flex justify-between items-center mt-2 pr-6 py-1 whitespace-nowrap text-bold text-sm font-medium text-gray-700">
                  {editingMember && editingMember.id === member.id ? (
                    <input
                      type="text"
                      value={editingMember.name}
                      onChange={e => setEditingMember({ ...editingMember, name: e.target.value })}
                      className="border border-gray-300 rounded-md p-1"
                    />
                  ) : (
                    member.name
                  )}
                  <button
                    onClick={() => handleEditMember(member)}
                    className="ml-2 text-gray-300 hover:text-blue-700"
                  >
                    EDITAR NOME
                  </button>
                  {editingMember && editingMember.id === member.id && (
                    <button
                      onClick={handleUpdateMember}
                      className="ml-2 text-green-500 hover:text-green-700"
                    >
                      ✔️
                    </button>
                  )}
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-center text-sm">
                  {member.startDate || 'N/A'}
                </td>
                <td className={`px-6 py-2 whitespace-nowrap text-center text-sm ${isPastToday(member.endDate) ? 'text-red-500' : 'text-gray-500'}`}>
                  {member.isInactive ? 'X' : member.endDate || 'N/A'}
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-center text-sm text-gray-500">
                  <button
                    onClick={() => handleAddMembership(member.id)}
                    className="bg-blue-500 hover:bg-blue-700 active:bg-blue-900 text-white font-bold py-1 px-2 rounded"
                  >
                    Atualizar Matrícula
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
};

export default Members;
