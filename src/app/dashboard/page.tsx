'use client'

import { useAuthGuard } from '../hooks/useAuth';
import React, { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import 'chart.js/auto';
import {
  Users,
  CreditCard,
  DollarSign,
  TrendingUp,
} from "lucide-react";

import { db } from '@/lib/firebase';
import {
  collection,
  collectionGroup,
  getDocs,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { DashboardCard } from '@/components/DashboardCard';

export default function Dashboard() {
  useAuthGuard();

  interface Membership {
    id: string;
    memberId: string;
    startDate: Date;
    endDate: Date;
    month: number;
    year: number;
    paidAmount: number;
  }
  
  interface Member {
      id: string;
      name: string;
  }

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [totalMemberships, setTotalMemberships] = useState<number>(0);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [activeMembers, setActiveMembers] = useState<number>(0);
  const [showRevenue, setShowRevenue] = useState<boolean>(true); // Começar mostrando os valores
  const [darkMode, setDarkMode] = useState<boolean>(false);

  useEffect(() => {
    fetchMembers();
    fetchMemberships();
  }, []);

  useEffect(() => {
    const now = new Date();
    const filteredMemberships = memberships.filter(m => m.year === year);
    setTotalMemberships(filteredMemberships.length);

    const revenue = filteredMemberships.reduce((acc, curr) => acc + curr.paidAmount, 0);
    setTotalRevenue(revenue);

    const activeMemberIds = new Set<string>();
    memberships.forEach(m => {
      if (m.endDate >= now) {
        activeMemberIds.add(m.memberId);
      }
    });
    setActiveMembers(activeMemberIds.size);

  }, [memberships, members, year]);
  
  const fetchMembers = async () => {
    try {
      const qSnap: QuerySnapshot<DocumentData> = await getDocs(collection(db, 'members'));
      const data = qSnap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
      } as Member));
      setMembers(data);
    } catch (error) {
      console.error("Erro ao buscar membros:", error);
    }
  };

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
          startDate: d.startDate.toDate(),
          endDate: d.endDate.toDate(),
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

  const aggregateDataByMonth = (dataType: 'revenue' | 'memberships') => {
      const data = new Array(12).fill(0);
      memberships.forEach(m => {
          if (m.year === year) {
              if (dataType === 'revenue') {
                data[m.month - 1] += m.paidAmount;
              } else {
                data[m.month - 1]++;
              }
          }
      });
      return data;
  }

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setYear(parseInt(e.target.value));
  };

  const toggleShowRevenue = () => {
    setShowRevenue(prev => !prev);
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };
  
  const monthLabels = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];

  const revenueChartData = {
    labels: monthLabels,
    datasets: [
      {
        label: `Receita em ${year} (R$)`,
        data: aggregateDataByMonth('revenue'),
        backgroundColor: darkMode ? 'rgba(255, 115, 0, 0.4)' : 'rgba(255, 115, 0, 0.7)',
        borderColor: 'rgb(255, 115, 0)',
        borderWidth: 1,
      }
    ]
  };
  
  const enrollmentChartData = {
    labels: monthLabels,
    datasets: [
      {
        label: `Novas Matrículas em ${year}`,
        data: aggregateDataByMonth('memberships'),
        backgroundColor: darkMode ? 'rgba(54, 162, 235, 0.4)' : 'rgba(54, 162, 235, 0.7)',
        borderColor: 'rgb(54, 162, 235)',
        borderWidth: 1,
        type: 'line' as const,
        tension: 0.2
      }
    ]
  };

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Opções específicas para o gráfico de receita
  const revenueChartOptions = {
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
        ticks: { 
            color: darkMode ? '#ffffff' : '#333333',
            callback: function(value: any) {
                if (showRevenue) {
                    return formatCurrency(value);
                }
                return 'R$ ****';
            }
        }
      },
      x: {
        grid: { color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
        ticks: { color: darkMode ? '#ffffff' : '#333333' }
      }
    },
    plugins: {
      legend: { labels: { color: darkMode ? '#ffffff' : '#333333' } },
      tooltip: {
          callbacks: {
              label: function(context: any) {
                  let label = context.dataset.label || '';
                  if (label) {
                      label += ': ';
                  }
                  if (showRevenue) {
                      label += formatCurrency(context.parsed.y);
                  } else {
                      label += 'R$ ****';
                  }
                  return label;
              }
          }
      }
    },
    maintainAspectRatio: false,
    responsive: true
  };

  // Opções específicas para o gráfico de matrículas
  const enrollmentChartOptions = {
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
        ticks: { 
            color: darkMode ? '#ffffff' : '#333333',
            precision: 0 // Garante que o eixo Y mostre apenas números inteiros
        }
      },
      x: {
        grid: { color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
        ticks: { color: darkMode ? '#ffffff' : '#333333' }
      }
    },
    plugins: {
      legend: { labels: { color: darkMode ? '#ffffff' : '#333333' } },
      tooltip: {
          callbacks: {
              label: function(context: any) {
                  let label = context.dataset.label || '';
                  if (label) {
                      label += ': ';
                  }
                  label += context.parsed.y;
                  return label;
              }
          }
      }
    },
    maintainAspectRatio: false,
    responsive: true
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
        <h2 className={`text-2xl font-bold text-center mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Visão Geral</h2>
        <div className="flex justify-center items-center gap-4 mb-8">
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
              {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() + 5 - i)
                .map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button
                onClick={toggleShowRevenue}
                className={`font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 transition duration-150 text-sm ${
                    darkMode
                    ? 'bg-gray-800 hover:bg-gray-700 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
                >
                {showRevenue ? 'Ocultar Valores' : 'Mostrar Valores'}
            </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <DashboardCard
              title="Total de Alunos"
              value={members.length}
              description={`${activeMembers} ativos`}
              icon={<Users className="w-4 h-4" />}
            />
            <DashboardCard
              title="Matrículas no Ano"
              value={totalMemberships}
              description={`em ${year}`}
              icon={<CreditCard className="w-4 h-4" />}
            />
            <DashboardCard
              title="Receita no Ano"
              value={showRevenue ? formatCurrency(totalRevenue) : "R$ *****"}
              description={`em ${year}`}
              icon={<DollarSign className="w-4 h-4" />}
              className={!showRevenue ? '' : ''}
            />
             <DashboardCard
              title="Ticket Médio"
              value={showRevenue ? formatCurrency(totalMemberships > 0 ? totalRevenue/totalMemberships : 0) : "R$ *****"}
              description={`em ${year}`}
              icon={<TrendingUp className="w-4 h-4" />}
              className={!showRevenue ? '' : ''}
            />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-8">
            <div className={`rounded-lg shadow-lg p-6 pb-12 border h-96 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                <h3 className="text-lg font-semibold mb-4">Receita Mensal ({year})</h3>
                <Bar data={revenueChartData} options={revenueChartOptions as any} />
            </div>
             <div className={`rounded-lg shadow-lg p-6 pb-12 border h-96 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                <h3 className="text-lg font-semibold mb-4">Novas Matrículas ({year})</h3>
                <Line data={enrollmentChartData} options={enrollmentChartOptions as any} />
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