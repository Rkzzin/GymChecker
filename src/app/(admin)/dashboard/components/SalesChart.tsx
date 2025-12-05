import React from 'react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { Payment } from '../types';
import { getMonthlyData } from '../utils';

interface SalesChartProps {
  data: Payment[];
  year: number;
  darkMode: boolean;
}

export function SalesChart({ data, year, darkMode }: SalesChartProps) {
  const chartData = {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    datasets: [{
      label: `Vendas (${year})`,
      data: getMonthlyData(data, year, 'count'),
      backgroundColor: darkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)',
      borderColor: '#3B82F6',
      borderWidth: 2,
      pointBackgroundColor: '#3B82F6',
      tension: 0.3,
      fill: true
    }]
  };

  const options = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: darkMode ? '#1f2937' : '#ffffff',
        titleColor: darkMode ? '#f3f4f6' : '#111827',
        bodyColor: darkMode ? '#d1d5db' : '#374151',
        borderColor: darkMode ? '#374151' : '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        displayColors: false
      }
    },
    scales: {
      x: {
        ticks: { color: darkMode ? '#9ca3af' : '#6b7280', font: { size: 11 } },
        grid: { display: false }
      },
      y: {
        ticks: { color: darkMode ? '#9ca3af' : '#6b7280', font: { size: 11 } },
        grid: { color: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
        border: { display: false }
      }
    }
  };

  return <Line data={chartData} options={options as any} />;
}