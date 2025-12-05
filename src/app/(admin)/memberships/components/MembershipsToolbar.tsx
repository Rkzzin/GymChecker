import React from 'react';

interface MembershipsToolbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  cardClass: string;
  inputClass: string;
}

export function MembershipsToolbar({ searchQuery, onSearchChange, cardClass, inputClass }: MembershipsToolbarProps) {
  return (
    <div className={`mb-6 p-4 rounded-xl shadow-sm border ${cardClass}`}>
      <h2 className="text-xl font-bold mb-4">Histórico de Matrículas</h2>
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar histórico de aluno..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className={`w-full h-11 pl-10 pr-4 rounded-lg border text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all ${inputClass}`}
        />
        <span className="absolute left-3 top-3 opacity-50">🔍</span>
      </div>
    </div>
  );
}