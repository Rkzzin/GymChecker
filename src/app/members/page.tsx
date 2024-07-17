'use client';

import React, { useState, useEffect } from 'react';
import MembersList from '../../_components/MembersList';

const Members = () => {
  const [members, setMembers] = useState([])
  const [memberships, setMemberships] = useState([])

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

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-900">Membros</h1>
          <nav className="mt-4">
            <a href="/dashboard" className="text-blue-600 hover:text-blue-800 mr-4">Dashboard</a>
            <a href="/members" className="font-bold text-blue-600 hover:text-blue-800 mr-4">Membros</a>
            <a href="/" className="text-blue-600 hover:text-blue-800">Logout</a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 text-gray-900">
        <MembersList members={members} memberships={memberships} />
      </main>
    </div>
  );
};

export default Members;
