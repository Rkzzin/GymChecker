import React from 'react';
import { Pie } from 'react-chartjs-2';
import 'chart.js/auto';
import { Payment } from '../types';
import { getPaymentMethodsData } from '../utils';

interface PaymentMethodChartProps {
  data: Payment[];
  year: number;
  darkMode: boolean;
}

export function PaymentMethodChart({ data, year, darkMode }: PaymentMethodChartProps) {
  const { labels, data: values } = getPaymentMethodsData(data, year);

  const chartData = {
    labels: labels,
    datasets: [{
      data: values,
      backgroundColor: ['#10B981', '#F59E0B', '#8B5CF6', '#6B7280'],
      borderWidth: 0
    }]
  };

  const options = {
    maintainAspectRatio: false,
    responsive: true,
    cutout: '70%', // Estilo "Donut"
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: darkMode ? '#d1d5db' : '#374151',
          boxWidth: 12,
          usePointStyle: true,
          font: { size: 11 }
        }
      }
    }
  };

  return <Pie data={chartData} options={options as any} />;
}