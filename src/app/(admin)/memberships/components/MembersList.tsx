import React from 'react';
import { Member, Membership } from '../types';

interface MembersListProps {
  filteredMembers: Member[];
  memberships: Membership[];
  openMemberships: { [key: string]: boolean };
  loadingMemberships: { [key: string]: boolean };
  onToggle: (id: string) => void;
  onEdit: (m: Membership, name: string) => void;
  onDelete: (id: string) => void;
  darkMode: boolean;
  cardClass: string;
}

export function MembersList({
  filteredMembers,
  memberships,
  openMemberships,
  loadingMemberships,
  onToggle,
  onEdit,
  onDelete,
  darkMode,
  cardClass
}: MembersListProps) {

  return (
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
              onClick={() => onToggle(member.id)}
              disabled={loadingMemberships[member.id]}
            >
              {loadingMemberships[member.id] ? 'Carregando...' : (openMemberships[member.id] ? 'Fechar Histórico' : 'Ver Histórico')}
            </button>
          </div>

          {/* Tabela de Histórico (Aninhada) */}
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
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'}`}>
                            {membership.planName}
                          </span>
                        </td>
                        <td className="px-6 py-4 opacity-80">{membership.startDate}</td>
                        <td className="px-6 py-4 font-medium">{membership.endDate}</td>
                        <td className="px-6 py-4 opacity-80">R$ {membership.price.toFixed(2)}</td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-3">
                            <button
                              onClick={() => onEdit(membership, member.name)}
                              className="text-gray-400 hover:text-blue-500 p-1 transition-colors"
                              title="Editar datas"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => onDelete(membership.id)}
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
  );
}