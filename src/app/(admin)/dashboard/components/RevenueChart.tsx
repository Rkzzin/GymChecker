import React from 'react';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import { Payment } from '../types';
import { getMonthlyData } from '../utils';

interface ChartProps {
	data: Payment[];
	year: number;
	darkMode: boolean;
}

export function RevenueChart({ data, year, darkMode }: ChartProps) {
	const chartData = {
		labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
		datasets: [{
			label: `Receita (${year})`,
			data: getMonthlyData(data, year, 'revenue'),
			backgroundColor: darkMode ? 'rgba(249, 115, 22, 0.7)' : 'rgba(249, 115, 22, 0.8)',
			borderColor: 'rgb(249, 115, 22)', borderWidth: 0, borderRadius: 4,
		}]
	};

	const options = {
		maintainAspectRatio: false, responsive: true,
		plugins: { legend: { display: false } },
		scales: {
			x: { ticks: { color: darkMode ? '#9ca3af' : '#6b7280' }, grid: { display: false } },
			y: { ticks: { color: darkMode ? '#9ca3af' : '#6b7280' }, grid: { color: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, border: { display: false } }
		}
	};

	return <Bar data={chartData} options={options as any} />;
}