import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Payment } from '../types';
import { getMonthlyData } from '../utils';

interface SalesChartProps {
  data: Payment[];
  year: number;
}

const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function SalesChart({ data, year }: SalesChartProps) {
  const monthlyData = getMonthlyData(data, year, 'count');
  const chartData = monthLabels.map((month, i) => ({
    month,
    value: monthlyData[i],
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="rgb(59, 130, 246)" strokeWidth={2} dot={{ fill: 'rgb(59, 130, 246)', r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
