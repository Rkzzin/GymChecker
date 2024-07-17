'use client';

import React, { useState, useEffect } from 'react';

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
  
  const [members, setMembers] = useState<Member[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [sortCriteria, setSortCriteria] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<string>('asc')

  useEffect(() => {
    fetchMembers()
    fetchMemberships()
  }, [])

  const fetchMembers = async () => {
    const response = await fetch('http://localhost:5000/members')
    const data = await response.json()
    setMembers(data)
  }

  const fetchMemberships = async () => {
    const response = await fetch('http://localhost:5000/memberships')
    const data = await response.json()
    setMemberships(data)
  }


  const handleAddMember = async (name: string) => {
    const response = await fetch('http://localhost:5000/create_member', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name })
    },
    )

    const data = await response.json()
    setMembers([...members, data])

    const memberId = data.id
    handleAddMembership(memberId)
  }

  const handleAddMembership = async (memberId: number) => {
    const response = await fetch('http://localhost:5000/create_membership', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ memberId })
    },
    )

    const data = await response.json()
    setMemberships([...memberships, data])
  }

  const sortMembers = (criteria: string) => {
    const sortedMembers = [...members].sort((a, b) => {
      if (criteria === 'name') {
        if (sortDirection === 'asc') {
          return a.name.localeCompare(b.name);
        } else {
          return b.name.localeCompare(a.name);
        }
      } else if (criteria === 'startDate' || criteria === 'endDate') {
        const aDate = new Date(
          memberships.find(m => m.memberId === a.id)?.[criteria] || ''
        ).getTime();
        const bDate = new Date(
          memberships.find(m => m.memberId === b.id)?.[criteria] || ''
        ).getTime();
        if (sortDirection === 'asc') {
          return aDate - bDate;
        } else {
          return bDate - aDate;
        }
      }
      return 0;
    });

    setMembers(sortedMembers);
  };

  const handleSort = (criteria: string) => {
    const newSortOrder = sortCriteria === criteria && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortCriteria(criteria);
    setSortDirection(newSortOrder);
    sortMembers(criteria);
  };

  const getMostRecentDate = (dates: string[]): string | undefined => {
    if (dates.length === 0) {
      return undefined; // or any appropriate handling for empty case
    }
  
    return dates.reduce((latest, date) => {
      return new Date(latest) > new Date(date) ? latest : date;
    }, dates[0]); // Provide dates[0] as the initial value
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <header className="flex items-center bg-white shadow">
        <img src="https://i.etsystatic.com/18154652/r/il/e4903a/1723732632/il_fullxfull.1723732632_mqzc.jpg" alt="" className='w-28 absolute left-4'/>
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
        <section className='w-full mb-5'>
          <h2 className="mb-1 text-xl font-semibold">Adicionar Membro</h2>
          <form
            onSubmit={event => {
              event.preventDefault()
              const formData = new FormData(event.target as HTMLFormElement)
              handleAddMember(formData.get('name') as string)
            }}
            className="w-full flex items-center justify-center"
          >
            <input
              name="name"
              type="text"
              placeholder="Nome"
              className="w-full mr-8 border border-gray-300 rounded-md p-2"
            />
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
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
                Data de Início {sortCriteria === 'startDate' && (sortDirection === 'asc' ? '↓' : '↑')}
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
            {members.map(member => {
              const memberStartDates = memberships
              .filter(membership => membership.memberId === member.id)
              .map(membership => membership.startDate);

            const memberEndDates = memberships
              .filter(membership => membership.memberId === member.id)
              .map(membership => membership.endDate);

            const mostRecentStartDate = getMostRecentDate(memberStartDates);
            const mostRecentEndDate = getMostRecentDate(memberEndDates);

              return (
                <tr key={member.id}>
                  <td className="pl-6 py-2 whitespace-nowrap text-sm text-gray-500">
                    {member.id}
                  </td>
                  <td className="pr-6 py-2 whitespace-nowrap text-bold text-sm font-medium text-gray-700">
                    {member.name}
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-center text-sm text-gray-500">
                    {mostRecentStartDate}
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-center text-sm text-gray-500">
                    {mostRecentEndDate}
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
              );
            })}
          </tbody>

        </table>

      </main>
    </div>
  );
};

export default Members;
