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

  const chartData = {
    labels: [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ],
    datasets: [
      {
        label: `Receita em ${year} (R$)`,
        data: aggregateRevenueByMonth(),
        backgroundColor: 'rgba(255, 115, 0, 0.4)',
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
          color: 'rgba(255, 255, 255, 0.1)',
          drawOnChartArea: true
        },
        ticks: {
          color: '#ffffff',
          callback: function (tickValue: number | string) {
            const value = Number(tickValue);
            return `R$ ${value.toFixed(2)}`;
          }
        },
        title: {
          display: true,
          text: 'Receita (R$)',
          color: '#ffffff'
        }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawOnChartArea: true
        },
        ticks: {
          color: '#ffffff'
        }
      }
    },
    plugins: {
      legend: {
        labels: {
          color: '#ffffff'
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
    <div className="min-h-screen bg-black text-white">
      <header className="bg-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            <span className="text-orange-500">RLFITNESS</span>
            <span className="text-white">|EVOLUTION</span>
          </h1>
          <nav className="flex space-x-6">
            <a href="/dashboard" className="text-orange-500 hover:text-orange-400 font-medium uppercase text-sm">Dashboard</a>
            <a href="/members" className="text-gray-300 hover:text-white font-medium uppercase text-sm">Membros</a>
            <a href="/memberships" className="text-gray-300 hover:text-white font-medium uppercase text-sm">Matrículas</a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-center mb-8">Visão Geral Anual</h2>
        <div className="grid grid-cols-1 gap-8">
          <div className="bg-gray-900 rounded-lg shadow-lg p-6 border border-gray-800">
            <div className="flex flex-wrap justify-between items-center mb-6">
              <div className="flex items-center">
                <label htmlFor="year" className="mr-2 font-medium text-gray-300">Ano:</label>
                <select
                  id="year"
                  value={year}
                  onChange={handleYearChange}
                  className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {Array.from({ length: 11 }, (_, i) => year + 5 - i)
                    .map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <button
                  onClick={toggleShowRevenue}
                  className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 transition duration-150"
                >
                  {showRevenue ? 'Ocultar Saldo' : 'Mostrar Saldo'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 flex flex-col items-center justify-center">
                <p className="text-sm text-gray-400 mb-2">Total de matrículas</p>
                <p className="text-3xl font-semibold text-orange-500">{totalMemberships}</p>
              </div>
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 flex flex-col items-center justify-center">
                <p className="text-sm text-gray-400 mb-2">Receita total</p>
                <p className={`text-3xl font-semibold text-orange-500 transition-all duration-200 ${showRevenue ? '' : 'blur-md select-none'}`}>
                  {formatCurrency(totalRevenue)}
                </p>
              </div>
            </div>

            <div className="h-96">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg shadow-lg p-6 border border-gray-800">
            <h3 className="text-xl font-medium mb-4 text-gray-200">Detalhamento Mensal ({year})</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-gray-900">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="py-3 px-4 border-b border-gray-700 text-left text-gray-300">Mês</th>
                    <th className="py-3 px-4 border-b border-gray-700 text-right text-gray-300">Matrículas</th>
                    <th className="py-3 px-4 border-b border-gray-700 text-right text-gray-300">Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.labels.map((month, index) => {
                    const count = aggregateMembershipsByMonth()[index];
                    const revenue = aggregateRevenueByMonth()[index];
                    return (
                      <tr key={index} className="hover:bg-gray-800">
                        <td className="py-3 px-4 border-b border-gray-800">{month}</td>
                        <td className="py-3 px-4 border-b border-gray-800 text-right">{count}</td>
                        <td className={`py-3 px-4 border-b border-gray-800 text-right text-orange-400 transition-all duration-200 ${showRevenue ? '' : 'blur-md select-none'}`}>{formatCurrency(revenue)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-800 font-medium">
                  <tr>
                    <td className="py-3 px-4 border-t border-gray-700 text-gray-200">Total</td>
                    <td className="py-3 px-4 border-t border-gray-700 text-right text-gray-200">{totalMemberships}</td>
                    <td className={`py-3 px-4 border-t border-gray-700 text-right text-orange-500 transition-all duration-200 ${showRevenue ? '' : 'blur-md select-none'}`}>{formatCurrency(totalRevenue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-black border-t border-gray-800 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
          <div className="flex space-x-4 mb-2">
            <a href="#" className="text-gray-400 hover:text-white">IG</a>
            <a href="#" className="text-gray-400 hover:text-white">TW</a>
            <a href="#" className="text-gray-400 hover:text-white">FB</a>
          </div>
          <p className="text-sm text-gray-500">© 2025 RLFitness Evolution</p>
        </div>
      </footer>
    </div>
  );
}