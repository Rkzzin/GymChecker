import React from 'react';
import { MemberWithMembership } from '../types';
import { isWithinExpirationRange } from '../utils';

interface MembersTableProps {
	members: MemberWithMembership[];
	loading: boolean;
	sortCriteria: string;
	sortDirection: 'asc' | 'desc';
	onSort: (field: 'name' | 'startDate' | 'endDate') => void;
	onEdit: (member: MemberWithMembership) => void;
	onRenew: (member: MemberWithMembership) => void;
	onArchive: (member: MemberWithMembership) => void;
	view: 'active' | 'archived';
	darkMode: boolean;
}

export function MembersTable({
	members,
	loading,
	sortCriteria,
	sortDirection,
	onSort,
	onEdit,
	onRenew,
	onArchive,
	view,
	darkMode
}: MembersTableProps) {

	const cardClass = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
	const headerClass = darkMode ? 'bg-gray-800/50 border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700';

	return (
		<div className={`rounded-xl shadow-sm border overflow-hidden ${cardClass}`}>
			<table className="w-full text-sm">
				<thead className={`border-b ${headerClass}`}>
					<tr>
						<th
							onClick={() => onSort('name')}
							className="px-6 py-3 text-left font-semibold cursor-pointer hover:text-orange-500 transition-colors"
						>
							Aluno {sortCriteria === 'name' && (sortDirection === 'asc' ? '↓' : '↑')}
						</th>
						<th className="px-6 py-3 text-left font-semibold">Plano</th>
						<th
							onClick={() => onSort('endDate')}
							className="px-6 py-3 text-left font-semibold cursor-pointer hover:text-orange-500 transition-colors"
						>
							Vencimento {sortCriteria === 'endDate' && (sortDirection === 'asc' ? '↓' : '↑')}
						</th>
						<th className="px-6 py-3 text-center font-semibold">Ações</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-gray-200 dark:divide-gray-800">
					{loading ? (
						<tr><td colSpan={4} className="p-8 text-center text-gray-500">Carregando membros...</td></tr>
					) : members.length === 0 ? (
						<tr><td colSpan={4} className="p-8 text-center text-gray-500">Nenhum membro encontrado.</td></tr>
					) : members.map(m => {
						const isExpiring = isWithinExpirationRange(m.endDate);

						return (
							<tr key={m.id} className={`group ${darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'} transition-colors`}>
								<td className="px-6 py-4">
									<div className="flex items-center gap-2">
										<span className="font-semibold text-base">{m.name}</span>
										<button
											onClick={() => onEdit(m)}
											className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-orange-500 transition-opacity p-1"
											title="Editar dados"
										>
											✏️
										</button>
									</div>
									<div className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
										{m.phone || 'Sem telefone'} • {m.email || 'Sem email'}
									</div>
									{m.notes && (
										<div className="mt-1.5 text-xs italic opacity-60 flex items-start gap-1">
											<span className="text-[10px]">📝</span> {m.notes}
										</div>
									)}
								</td>
								<td className="px-6 py-4">
									<span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'}`}>
										{m.lastPlanName || 'Sem plano'}
									</span>
								</td>
								<td className="px-6 py-4">
									<div className="flex flex-col gap-1">
										{m.isInactive ? (
											<span className="inline-flex w-fit px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
												Expirado
											</span>
										) : isExpiring ? (
											<span className="inline-flex w-fit px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
												Expirando
											</span>
										) : (
											<span className="inline-flex w-fit px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
												Ativo
											</span>
										)}
										<span className="text-xs text-muted-foreground">{m.endDate || '-'}</span>
									</div>
								</td>
								<td className="px-6 py-4 text-center">
									<div className="flex justify-center gap-2">
										{view === 'active' && (
											<button
												onClick={() => onRenew(m)}
												className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-xs font-bold transition-colors shadow-sm"
											>
												RENOVAR
											</button>
										)}
										<button
											onClick={() => onArchive(m)}
											className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${darkMode ? 'border-gray-700 hover:bg-gray-800 text-gray-400' : 'border-gray-300 hover:bg-gray-100 text-gray-600'}`}
										>
											{view === 'active' ? 'Arquivar' : 'Reativar'}
										</button>
									</div>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}