import React from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { Payment } from '../types';
import { formatCurrency, getMethodBadgeClass } from '../utils';

interface PaymentsTableProps {
	payments: Payment[];
	loading: boolean;
	onEdit: (payment: Payment) => void;
}

export function PaymentsTable({ payments, loading, onEdit }: PaymentsTableProps) {
	const { darkMode } = useTheme();
	const cardClass = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';

	return (
		<div className={`rounded-xl shadow-sm border overflow-hidden ${cardClass}`}>
			<table className="w-full text-sm">
				<thead className={`border-b ${darkMode ? 'bg-gray-800/50 border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
					<tr>
						<th className="px-6 py-3 text-left font-semibold">Data</th>
						<th className="px-6 py-3 text-left font-semibold">Aluno</th>
						<th className="px-6 py-3 text-left font-semibold">Valor</th>
						<th className="px-6 py-3 text-left font-semibold">Método</th>
						<th className="px-6 py-3 text-left font-semibold">Obs</th>
						<th className="px-6 py-3 text-center font-semibold">Ações</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-gray-200 dark:divide-gray-800">
					{loading ? (
						<tr><td colSpan={6} className="p-8 text-center text-gray-500">Carregando dados...</td></tr>
					) : payments.length === 0 ? (
						<tr><td colSpan={6} className="p-8 text-center text-gray-500">Nenhum pagamento encontrado.</td></tr>
					) : (
						payments.map(pay => (
							<tr key={pay.id} className={`group ${darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'} transition-colors`}>
								<td className="px-6 py-4 whitespace-nowrap opacity-80">{new Date(pay.payment_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
								<td className="px-6 py-4 font-medium">{pay.customer?.name || 'Desconhecido'}</td>
								<td className="px-6 py-4 font-bold text-green-600 dark:text-green-400">{formatCurrency(pay.amount)}</td>
								<td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${getMethodBadgeClass(pay.method || '')}`}>{pay.method}</span></td>
								<td className="px-6 py-4 text-xs italic opacity-60 max-w-xs truncate">{pay.notes || '-'}</td>
								<td className="px-6 py-4 text-center">
									<button onClick={() => onEdit(pay)} className="text-gray-400 hover:text-orange-500 transition-colors p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">✏️</button>
								</td>
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}