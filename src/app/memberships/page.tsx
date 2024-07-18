'use client'

import React, { useState, useEffect } from 'react';

export default function Memberships() {
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

  const [members, setMembers] = useState<Member[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMemberships, setOpenMemberships] = useState<{ [key: number]: boolean }>({});
  const [allOpen, setAllOpen] = useState(false);

  useEffect(() => {
    fetchMembers();
    fetchMemberships();
  }, []);

  const fetchMembers = async () => {
    const response = await fetch('http://localhost:5000/members')
    const data = await response.json()
    setMembers(data)
  }

  const fetchMemberships = async () => {
    const response = await fetch('http://localhost:5000/memberships');
    const data = await response.json();
    setMemberships(data);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const filteredMembers = members.filter(member => 
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleMemberships = (memberId: number) => {
    setOpenMemberships(prevState => ({
      ...prevState,
      [memberId]: !prevState[memberId]
    }));
  };

  const toggleAllMemberships = () => {
    setAllOpen(!allOpen);
    const newState: { [key: number]: boolean } = {};
    filteredMembers.forEach(member => {
      newState[member.id] = !allOpen;
    });
    setOpenMemberships(newState);
  };

  return (
    <div className="min-h-screen bg-gray-100 justify-center">
      <header className="flex items-center bg-white shadow">
        <img src="https://i.etsystatic.com/18154652/r/il/e4903a/1723732632/il_fullxfull.1723732632_mqzc.jpg" alt="" className='w-28 absolute left-4'/>
        <div className="py-6 px-36">
          <h1 className="text-3xl font-bold leading-tight text-gray-900">Matrículas</h1>
          <nav className="mt-4">
            <a href="/dashboard" className="text-blue-600 hover:text-blue-800 mr-4">Painel</a>
            <a href="/members" className="text-blue-600 hover:text-blue-800 mr-4">Membros</a>
            <a href="/memberships" className="font-bold text-blue-600 hover:text-blue-800 mr-4">Matrículas</a>
            <a href="/" className="text-blue-600 hover:text-blue-800">Logout</a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 text-gray-900">
        <div className="w-full flex-col justify-between items-center">
          <h2 className="mb-1 text-xl font-semibold">Alunos</h2>
          <nav className='w-full flex items-center justify-center'>
            <input 
              type="text" 
              placeholder="Pesquisar aluno" 
              className="w-full border border-gray-300 p-2 rounded-lg mr-8"
              value={searchQuery}
              onChange={handleSearch}
            />
            <button className="bg-blue-500 hover:bg-blue-700 active:bg-blue-900 text-white font-bold px-4 py-1 rounded" onClick={toggleAllMemberships}>
              {allOpen ? 'Fechar Todas' : 'Abrir Todas'}
            </button>
          </nav>
        </div>
        
        <div className="mt-4">
          {filteredMembers.map(member => (
            <div key={member.id} className="mb-4 bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{member.name}</h3>
                <button className="bg-blue-500 hover:bg-blue-700 active:bg-blue-900 text-white font-bold py-1 px-3 rounded" onClick={() => toggleMemberships(member.id)}>
                  {openMemberships[member.id] ? 'Fechar' : 'Abrir'}
                </button>
              </div>
              {openMemberships[member.id] && (
                <div className="mt-2">
                  <table className="min-w-full bg-white">
                    <thead>
                      <tr>
                        <th className="py-1">ID</th>
                        <th className="py-1">Data de início</th>
                        <th className="py-1">Vencimento</th>
                      </tr>
                    </thead>
                    <tbody className='text-center'>
                      {memberships.filter(m => m.memberId === member.id).map(membership => (
                        <tr key={membership.id}>
                          <td className="border px-1 py-2">{membership.id}</td>
                          <td className="border px-8 py-2">{membership.startDate}</td>
                          <td className="border px-8 py-2">{membership.endDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}