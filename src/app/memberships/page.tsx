// Adicionar logo 

import React from 'react';

export default function Memberships() {
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
      </main>
    </div>
  );
}