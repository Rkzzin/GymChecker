'use client'

import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';

export default function Dashboard() {
  interface Membership {
    id: number;
    memberId: number;
    startDate: string;
    endDate: string;
    month: number;
    year: number;
  }

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [year, setYear] = useState<number>(new Date().getFullYear()); // Default to current year
  const [totalMemberships, setTotalMemberships] = useState<number>(0);

  useEffect(() => {
    fetchMemberships();
  }, []);

  useEffect(() => {
    const total = aggregateTotalMemberships();
    setTotalMemberships(total);
  }, [memberships, year]);

  const fetchMemberships = async () => {
    const response = await fetch('http://localhost:5000/memberships');
    const data = await response.json();
    setMemberships(data);
  };

  const aggregateMembershipsByMonth = () => {
    const monthlyCounts = new Array(12).fill(0);
    memberships.forEach(m => {
      if (m.year === year) {
        monthlyCounts[m.month - 1]++;
      }
    });
    return monthlyCounts;
  };

  const aggregateTotalMemberships = () => {
    return memberships.filter(m => m.year === year).length;
  };

  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setYear(parseInt(event.target.value));
  };

  const chartData = {
    labels: [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ],
    datasets: [
      {
        label: `Matrículas em ${year}`,
        data: aggregateMembershipsByMonth(),
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    scales: {
      y: {
        ticks: {
          callback: function(value: string | number) {
            return Number(value) * 80;
          }
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-900">Painel</h1>
          <nav className="mt-4">
            <a href="/dashboard" className="font-bold text-blue-600 hover:text-blue-800 mr-4">Painel</a>
            <a href="/members" className="text-blue-600 hover:text-blue-800 mr-4">Membros</a>
            <a href="/" className="text-blue-600 hover:text-blue-800">Logout</a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 text-gray-900">
        <div className="mb-4">
          <label htmlFor="year" className="mr-2">Ano:</label>
          <select id="year" value={year} onChange={handleYearChange} className="mr-4">
            {Array.from(Array(10).keys()).map(y => (
              <option key={year - y} value={year - y}>{year - y}</option>
            ))}
          </select>
          <span>Total de matrículas: {totalMemberships}</span>
        </div>

        <Bar data={chartData} options={chartOptions}/>
      </main>
    </div>
  );
}
