import React from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { Plan } from '../types';
import { formatCurrency, getStatusBadgeClass } from '../utils';

interface PlansTableProps {
	plans: Plan[];
	loading: boolean;
	onEdit: (plan: Plan) => void;
	onToggleStatus: (plan: Plan) => void;
}

export function PlansTable({ plans, loading, onEdit, onToggleStatus }: PlansTableProps) {
	const { darkMode } = useTheme();
	const cardClass = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';

	return (
		<section className={`rounded-xl shadow-sm border overflow-hidden ${cardClass}`}>
			<table className="w-full text-sm">
				<thead className={`border-b ${darkMode ? 'bg-gray-800/50 border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
					<tr>
						<th className="px-6 py-4 text-left font-semibold">Nome</th>
						<th className="px-6 py-4 text-left font-semibold">Preço</th>
						<th className="px-6 py-4 text-left font-semibold">Duração</th>
						<th className="px-6 py-4 text-center font-semibold">Status</th>
						<th className="px-6 py-4 text-center font-semibold">Ações</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-gray-200 dark:divide-gray-800">
					{loading ? (
						<tr><td colSpan={5} className="p-8 text-center text-gray-500">Carregando...</td></tr>
					) : plans.length === 0 ? (
						<tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum plano cadastrado.</td></tr>
					) : (
						plans.map(plan => (
							<tr key={plan.id} className={`group ${darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'} transition-colors`}>
								<td className="px-6 py-4 font-medium text-base">{plan.name}</td>
								<td className="px-6 py-4 text-orange-500 font-bold">{formatCurrency(plan.price)}</td>
								<td className="px-6 py-4 text-gray-500">{plan.duration_days} dias</td>
								<td className="px-6 py-4 text-center">
									<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusBadgeClass(plan.is_active)}`}>
										{plan.is_active ? 'Ativo' : 'Inativo'}
									</span>
								</td>
								<td className="px-6 py-4 text-center">
									<div className="flex justify-center gap-3">
										<button onClick={() => onEdit(plan)} className="text-gray-400 hover:text-blue-500 transition-colors p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20">✏️</button>
										<button onClick={() => onToggleStatus(plan)} className={`p-1.5 rounded-md transition-colors ${plan.is_active ? 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'}`}>
											{plan.is_active ? '🚫' : '✅'}
										</button>
									</div>
								</td>
							</tr>
						))
					)}
				</tbody>
			</table>
		</section>
	);
}