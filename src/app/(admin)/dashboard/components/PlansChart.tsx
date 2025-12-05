import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';
import { Subscription } from '../types';
import { getPlansData } from '../utils';

interface PlansChartProps {
  data: Subscription[];
  year: number;
  darkMode: boolean;
}

export function PlansChart({ data, year, darkMode }: PlansChartProps) {
  const { labels, data: values } = getPlansData(data, year);

  const chartData = {
    labels: labels,
    datasets: [{
      data: values,
      backgroundColor: ['#EC4899', '#3B82F6', '#F59E0B', '#10B981'],
      borderWidth: 0
    }]
  };

  const options = {
    maintainAspectRatio: false,
    responsive: true,
    cutout: '70%',
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

  return <Doughnut data={chartData} options={options as any} />;
}