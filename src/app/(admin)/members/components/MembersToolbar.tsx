import React from 'react';

interface MembersToolbarProps {
	searchQuery: string;
	onSearchChange: (value: string) => void;
	view: 'active' | 'archived';
	onViewChange: () => void;
	onOpenCreate: () => void;
	darkMode: boolean;
}

export function MembersToolbar({
	searchQuery,
	onSearchChange,
	view,
	onViewChange,
	onOpenCreate,
	darkMode
}: MembersToolbarProps) {

	const inputClass = darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900';
	const cardClass = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';

	return (
		<div className={`mb-6 p-4 rounded-xl shadow-sm border flex flex-col sm:flex-row justify-between items-center gap-4 ${cardClass}`}>
			<div className="relative w-full sm:w-1/3">
				<input
					type="text"
					placeholder="Buscar aluno..."
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					className={`w-full h-10 pl-10 pr-4 rounded-lg border text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all ${inputClass}`}
				/>
				<span className="absolute left-3 top-2.5 opacity-50">🔍</span>
			</div>

			<div className="flex gap-3 w-full sm:w-auto">
				<button
					onClick={onViewChange}
					className={`flex-1 sm:flex-none h-10 px-4 rounded-lg text-sm font-medium transition-colors border ${darkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'}`}
				>
					{view === 'active' ? 'Ver Arquivados' : 'Ver Ativos'}
				</button>
				<button
					onClick={onOpenCreate}
					className="flex-1 sm:flex-none h-10 px-6 rounded-lg text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20 transition-all"
				>
					+ Novo Aluno
				</button>
			</div>
		</div>
	);
}