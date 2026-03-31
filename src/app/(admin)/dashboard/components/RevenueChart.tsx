import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Payment } from '../types';
import { getMonthlyData, formatCurrency } from '../utils';

interface ChartProps {
	data: Payment[];
	year: number;
}

const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function RevenueChart({ data, year }: ChartProps) {
	const monthlyData = getMonthlyData(data, year, 'revenue');
	const chartData = monthLabels.map((month, i) => ({
		month,
		value: monthlyData[i],
	}));

	return (
		<ResponsiveContainer width="100%" height="100%">
			<BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
				<XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
				<YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={60} tickFormatter={(v) => formatCurrency(Number(v))} />
				<Tooltip formatter={(value) => formatCurrency(Number(value))} />
				<Bar dataKey="value" fill="rgb(249, 115, 22)" radius={[4, 4, 0, 0]} />
			</BarChart>
		</ResponsiveContainer>
	);
}
