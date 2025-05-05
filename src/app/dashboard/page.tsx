'use client'

import { useAuthGuard } from '../hooks/useAuth';
import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';

import { db } from '@/lib/firebase';
import {
  collectionGroup,
  getDocs,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';

export default function Dashboard() {
  useAuthGuard();

  interface Membership {
    id: string;
    memberId: string;
    startDate: string;
    endDate: string;
    month: number;
    year: number;
    paidAmount: number;
  }

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [totalMemberships, setTotalMemberships] = useState<number>(0);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [showRevenue, setShowRevenue] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  useEffect(() => {
    fetchMemberships();
  }, []);

  useEffect(() => {
    const filteredMemberships = memberships.filter(m => m.year === year);
    setTotalMemberships(filteredMemberships.length);

    // Calcular receita total para o ano selecionado
    const revenue = filteredMemberships.reduce((acc, curr) => acc + curr.paidAmount, 0);
    setTotalRevenue(revenue);
  }, [memberships, year]);

  const fetchMemberships = async () => {
    try {
      const qSnap: QuerySnapshot<DocumentData> =
        await getDocs(collectionGroup(db, 'memberships'));

      const data = qSnap.docs.map(doc => {
        const d = doc.data();
        let memberId = d.memberId as string;
        if (!memberId) {
          const parentDoc = doc.ref.parent.parent;
          if (parentDoc) {
            memberId = parentDoc.id;
          }
        }

        return {
          id: doc.id,
          memberId: memberId,
          startDate: d.startDate.toDate().toLocaleDateString('pt-BR'),
          endDate: d.endDate.toDate().toLocaleDateString('pt-BR'),
          month: d.month,
          year: d.year,
          paidAmount: d.paidAmount || 0
        } as Membership;
      });

      setMemberships(data);
    } catch (error) {
      console.error("Erro ao buscar matrículas:", error);
    }
  };

  const aggregateMembershipsByMonth = () => {
    const counts = new Array(12).fill(0);
    memberships.forEach(m => {
      if (m.year === year) counts[m.month - 1]++;
    });
    return counts;
  };

  const aggregateRevenueByMonth = () => {
    const revenue = new Array(12).fill(0);
    memberships.forEach(m => {
      if (m.year === year) revenue[m.month - 1] += m.paidAmount;
    });
    return revenue;
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setYear(parseInt(e.target.value));
  };

  const toggleShowRevenue = () => {
    setShowRevenue(prev => !prev);
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const chartData = {
    labels: [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ],
    datasets: [
      {
        label: `Receita em ${year} (R$)`,
        data: aggregateRevenueByMonth(),
        backgroundColor: darkMode ? 'rgba(255, 115, 0, 0.4)' : 'rgba(255, 115, 0, 0.7)',
        borderColor: 'rgb(255, 115, 0)',
        borderWidth: 1,
        yAxisID: 'y'
      }
    ]
  };

  const chartOptions = {
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: {
          color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          drawOnChartArea: true
        },
        ticks: {
          color: darkMode ? '#ffffff' : '#333333',
          callback: function (tickValue: number | string) {
            const value = Number(tickValue);
            return `R$ ${value.toFixed(2)}`;
          }
        },
        title: {
          display: true,
          text: 'Receita (R$)',
          color: darkMode ? '#ffffff' : '#333333'
        }
      },
      x: {
        grid: {
          color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          drawOnChartArea: true
        },
        ticks: {
          color: darkMode ? '#ffffff' : '#333333'
        }
      }
    },
    plugins: {
      legend: {
        labels: {
          color: darkMode ? '#ffffff' : '#333333'
        }
      }
    },
    maintainAspectRatio: false,
    responsive: true
  };

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-black text-white' : 'bg-gray-100 text-gray-900'}`}>
      <header className={`${darkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-200'} border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            <span className="text-orange-500">RLFITNESS</span>
            <span className={darkMode ? 'text-white' : 'text-gray-900'}>|EVOLUTION</span>
          </h1>
          <div className="flex items-center space-x-6">
            <nav className="flex space-x-6">
              <a href="/dashboard" className="text-orange-500 hover:text-orange-400 font-medium uppercase text-sm">Dashboard</a>
              <a href="/members" className={`${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} font-medium uppercase text-sm`}>Membros</a>
              <a href="/memberships" className={`${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} font-medium uppercase text-sm`}>Matrículas</a>
            </nav>
            <button 
              onClick={toggleDarkMode} 
              className={`p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'}`}
              title={darkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            >
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h2 className={`text-2xl font-bold text-center mb-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Visão Geral Anual</h2>
        <div className="grid grid-cols-1 gap-8">
          <div className={`rounded-lg shadow-lg p-6 border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="flex flex-wrap justify-between items-center mb-6">
              <div className="flex items-center">
                <label htmlFor="year" className={`mr-2 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Ano:</label>
                <select
                  id="year"
                  value={year}
                  onChange={handleYearChange}
                  className={`border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-700 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  {Array.from({ length: 11 }, (_, i) => year + 5 - i)
                    .map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <button
                  onClick={toggleShowRevenue}
                  className={`font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 transition duration-150 ${
                    darkMode
                      ? 'bg-gray-800 hover:bg-gray-700 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  }`}
                >
                  {showRevenue ? 'Ocultar Saldo' : 'Mostrar Saldo'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className={`rounded-lg border p-6 flex flex-col items-center justify-center ${
                darkMode
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total de matrículas</p>
                <p className="text-3xl font-semibold text-orange-500">{totalMemberships}</p>
              </div>
              <div className={`rounded-lg border p-6 flex flex-col items-center justify-center ${
                darkMode
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Receita total</p>
                <p className={`text-3xl font-semibold text-orange-500 transition-all duration-200 ${showRevenue ? '' : 'blur-md select-none'}`}>
                  {formatCurrency(totalRevenue)}
                </p>
              </div>
            </div>

            <div className="h-96">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          <div className={`rounded-lg shadow-lg p-6 border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <h3 className={`text-xl font-medium mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Detalhamento Mensal ({year})</h3>
            <div className="overflow-x-auto">
              <table className={`min-w-full ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
                <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                  <tr>
                    <th className={`py-3 px-4 border-b text-left ${
                      darkMode
                        ? 'border-gray-700 text-gray-300'
                        : 'border-gray-200 text-gray-600'
                    }`}>Mês</th>
                    <th className={`py-3 px-4 border-b text-right ${
                      darkMode
                        ? 'border-gray-700 text-gray-300'
                        : 'border-gray-200 text-gray-600'
                    }`}>Matrículas</th>
                    <th className={`py-3 px-4 border-b text-right ${
                      darkMode
                        ? 'border-gray-700 text-gray-300'
                        : 'border-gray-200 text-gray-600'
                    }`}>Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.labels.map((month, index) => {
                    const count = aggregateMembershipsByMonth()[index];
                    const revenue = aggregateRevenueByMonth()[index];
                    return (
                      <tr key={index} className={darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
                        <td className={`py-3 px-4 border-b ${
                          darkMode ? 'border-gray-800' : 'border-gray-200'
                        }`}>{month}</td>
                        <td className={`py-3 px-4 border-b text-right ${
                          darkMode ? 'border-gray-800' : 'border-gray-200'
                        }`}>{count}</td>
                        <td className={`py-3 px-4 border-b text-right text-orange-400 transition-all duration-200 ${
                          darkMode ? 'border-gray-800' : 'border-gray-200'
                        } ${showRevenue ? '' : 'blur-md select-none'}`}>{formatCurrency(revenue)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className={`font-medium ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <tr>
                    <td className={`py-3 px-4 border-t ${
                      darkMode
                        ? 'border-gray-700 text-gray-200'
                        : 'border-gray-200 text-gray-700'
                    }`}>Total</td>
                    <td className={`py-3 px-4 border-t text-right ${
                      darkMode
                        ? 'border-gray-700 text-gray-200'
                        : 'border-gray-200 text-gray-700'
                    }`}>{totalMemberships}</td>
                    <td className={`py-3 px-4 border-t text-right text-orange-500 transition-all duration-200 ${
                      darkMode
                        ? 'border-gray-700'
                        : 'border-gray-200'
                    } ${showRevenue ? '' : 'blur-md select-none'}`}>{formatCurrency(totalRevenue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </main>

      <footer className={`border-t py-6 mt-12 ${
        darkMode
          ? 'bg-black border-gray-800'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
          <div className="flex space-x-4 mb-2">
            <a href="#" className={darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}>IG</a>
            <a href="#" className={darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}>TW</a>
            <a href="#" className={darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}>FB</a>
          </div>
          <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>© 2025 RLFitness Evolution</p>
        </div>
      </footer>
    </div>
  );
}