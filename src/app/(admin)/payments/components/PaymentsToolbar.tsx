import React from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { formatCurrency } from '../utils';

interface PaymentsToolbarProps {
	total: number;
	month: number;
	year: number;
	setMonth: (m: number) => void;
	setYear: (y: number) => void;
}

export function PaymentsToolbar({ total, month, year, setMonth, setYear }: PaymentsToolbarProps) {
	const { darkMode } = useTheme();
	const cardClass = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
	const inputClass = darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900';

	return (
		<div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-6">
			<div className={`flex items-center gap-4 px-4 py-3 rounded-lg border ${cardClass}`}>
				<div className="text-sm font-medium opacity-70">Total do Período</div>
				<div className="text-xl font-bold text-green-500">{formatCurrency(total)}</div>
			</div>
			<div className="flex gap-3">
				<select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className={`h-10 pl-3 pr-8 rounded-md border text-sm ${inputClass}`}>
					{Array.from({ length: 12 }, (_, i) => (<option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}</option>))}
				</select>
				<select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className={`h-10 pl-3 pr-8 rounded-md border text-sm ${inputClass}`}>
					{[2023, 2024, 2025, 2026].map(y => (<option key={y} value={y}>{y}</option>))}
				</select>
			</div>
		</div>
	);
}