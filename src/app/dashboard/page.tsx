'use client'

import { useAuthGuard } from '../hooks/useAuth';
import React, { useState, useEffect } from 'react';
import { Bar, Line, Doughnut, Pie } from 'react-chartjs-2';
import 'chart.js/auto';
import {
  Users,
  CreditCard,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { DashboardCard } from '@/components/DashboardCard';

export default function Dashboard() {
  useAuthGuard();

  // --- Tipos ---
  interface Subscription {
    id: string;
    customer_id: string;
    start_date: string;
    end_date: string;
    created_at: string;
    plan?: { name: string };
  }

  interface Payment {
    id: string;
    amount: number;
    payment_date: string;
    method: string;
  }

  interface Member {
    id: string;
    name: string;
    status: string; // Adicionado status
  }

  // --- Estados ---
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [year, setYear] = useState<number>(new Date().getFullYear());

  // KPIs
  const [totalSalesCount, setTotalSalesCount] = useState<number>(0);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [activeMembers, setActiveMembers] = useState<number>(0);
  const [ticketMedio, setTicketMedio] = useState<number>(0);

  const [showRevenue, setShowRevenue] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // --- Efeitos ---
  useEffect(() => {
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme !== null) setDarkMode(savedTheme === 'true');

    // Inicia a busca completa
    fetchAllData();
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // --- Lógica de Cálculo (KPIs) ---
  useEffect(() => {
    if (loading) return;

    const now = new Date();

    // Filtro de Ano (Usando string match para ser agnóstico a fuso horário)
    const yearStr = year.toString();

    const yearPayments = payments.filter(p => {
      if (!p.payment_date) return false;
      // Pega os primeiros 4 caracteres da string ISO (YYYY)
      return p.payment_date.substring(0, 4) === yearStr;
    });

    // 1. Vendas no Ano (Quantidade total de pagamentos)
    const salesCount = yearPayments.length;
    setTotalSalesCount(salesCount);

    // 2. Receita Bruta
    const revenue = yearPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    setTotalRevenue(revenue);

    // 3. Ticket Médio
    setTicketMedio(salesCount > 0 ? revenue / salesCount : 0);

    // 4. Alunos Ativos (Baseado no STATUS do cliente)
    // Antes era baseado na vigência da matrícula, agora é pelo campo 'status' da tabela customer
    const activeCount = members.filter(m => m.status === 'active').length;
    setActiveMembers(activeCount);

  }, [subscriptions, payments, members, year, loading]);

  // --- BUSCA RECURSIVA ---
  const fetchAll = async (table: string, select = '*') => {
    let allData: any[] = [];
    let from = 0;
    const step = 1000;

    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select(select)
        .range(from, from + step - 1);

      if (error) {
        console.error(`Erro buscando ${table}:`, error);
        break;
      }

      if (!data || data.length === 0) break;

      allData = [...allData, ...data];

      if (data.length < step) break;

      from += step;
    }
    return allData;
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Clientes (Agora buscando status também)
      const membersData = await fetchAll('customer', 'id, name, status');
      setMembers(membersData);

      // 2. Assinaturas
      const subsData = await fetchAll('subscription', '*, plan(name)');
      setSubscriptions(subsData);

      // 3. Pagamentos
      const payData = await fetchAll('payment', '*');
      setPayments(payData);

    } catch (error) {
      console.error("Erro fatal no dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Dados dos Gráficos ---

  const getMonthlyData = (dataType: 'revenue' | 'count') => {
    const data = new Array(12).fill(0);
    payments.forEach(p => {
      if (!p.payment_date) return;
      const pYear = parseInt(p.payment_date.substring(0, 4));
      const pMonth = parseInt(p.payment_date.substring(5, 7)) - 1; // 0-11

      if (pYear === year) {
        if (dataType === 'revenue') {
          data[pMonth] += p.amount;
        } else {
          data[pMonth] += 1;
        }
      }
    });
    return data;
  }

  const getPaymentMethodsData = () => {
    const methods: { [key: string]: number } = {};
    payments.forEach(p => {
      if (!p.payment_date) return;
      const pYear = parseInt(p.payment_date.substring(0, 4));

      if (pYear === year) {
        const method = p.method ? p.method.charAt(0).toUpperCase() + p.method.slice(1) : 'Outros';
        methods[method] = (methods[method] || 0) + p.amount;
      }
    });
    return { labels: Object.keys(methods), data: Object.values(methods) };
  };

  const getPlansData = () => {
    const planCounts: { [key: string]: number } = {};
    subscriptions.forEach(s => {
      const refDate = s.created_at || s.start_date;
      if (!refDate) return;

      const sYear = parseInt(refDate.substring(0, 4));

      if (sYear === year) {
        const name = s.plan?.name || 'Personalizado';
        planCounts[name] = (planCounts[name] || 0) + 1;
      }
    });

    return {
      labels: Object.keys(planCounts),
      data: Object.values(planCounts)
    };
  };

  // --- UI Helpers ---
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setYear(parseInt(e.target.value));
  };
  const toggleShowRevenue = () => setShowRevenue(prev => !prev);
  const toggleDarkMode = () => setDarkMode(prev => !prev);
  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  // Charts Config
  const revenueChartData = {
    labels: monthLabels,
    datasets: [{
      label: `Receita (${year})`,
      data: getMonthlyData('revenue'),
      backgroundColor: darkMode ? 'rgba(249, 115, 22, 0.7)' : 'rgba(249, 115, 22, 0.8)',
      borderColor: 'rgb(249, 115, 22)', borderWidth: 0, borderRadius: 4,
    }]
  };

  const salesChartData = {
    labels: monthLabels,
    datasets: [{
      label: `Vendas (${year})`,
      data: getMonthlyData('count'),
      backgroundColor: darkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)',
      borderColor: '#3B82F6', borderWidth: 2, pointBackgroundColor: '#3B82F6', tension: 0.3, fill: true
    }]
  };

  const paymentMethodsInfo = getPaymentMethodsData();
  const paymentMethodChartData = {
    labels: paymentMethodsInfo.labels,
    datasets: [{ data: paymentMethodsInfo.data, backgroundColor: ['#10B981', '#F59E0B', '#8B5CF6', '#6B7280'], borderWidth: 0 }]
  };

  const plansInfo = getPlansData();
  const plansChartData = {
    labels: plansInfo.labels,
    datasets: [{ data: plansInfo.data, backgroundColor: ['#EC4899', '#3B82F6', '#F59E0B', '#10B981'], borderWidth: 0 }]
  };

  const commonOptions = {
    maintainAspectRatio: false, responsive: true,
    plugins: {
      legend: { display: false }, tooltip: {
        backgroundColor: darkMode ? '#1f2937' : '#ffffff', titleColor: darkMode ? '#f3f4f6' : '#111827',
        bodyColor: darkMode ? '#d1d5db' : '#374151', borderColor: darkMode ? '#374151' : '#e5e7eb', borderWidth: 1, padding: 12, displayColors: false
      }
    },
    scales: {
      x: { ticks: { color: darkMode ? '#9ca3af' : '#6b7280', font: { size: 11 } }, grid: { display: false } },
      y: { ticks: { color: darkMode ? '#9ca3af' : '#6b7280', font: { size: 11 } }, grid: { color: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, border: { display: false } }
    }
  };

  const donutOptions = {
    maintainAspectRatio: false, responsive: true, cutout: '70%',
    plugins: { legend: { position: 'right' as const, labels: { color: darkMode ? '#d1d5db' : '#374151', boxWidth: 12, usePointStyle: true, font: { size: 11 } } } }
  };

  // Estilos
  const bgClass = darkMode ? 'bg-black text-gray-100' : 'bg-gray-50 text-gray-900';
  const cardClass = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const headerClass = darkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-200';
  const linkClass = darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900';
  const kpiLabelClass = darkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`min-h-screen ${bgClass} transition-colors duration-300`}>
      {/* Header */}
      <header className={`sticky top-0 z-30 border-b ${headerClass} backdrop-blur-md bg-opacity-90`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2 select-none">
            <h1 className="text-xl font-bold tracking-tight"><span className="text-orange-500">RLFITNESS</span><span className={`${darkMode ? 'text-white' : 'text-gray-900'} mx-1`}>|</span><span className={darkMode ? 'text-gray-200' : 'text-gray-800'}>EVOLUTION</span></h1>
          </div>
          <nav className="hidden md:flex space-x-8">
            <a href="/dashboard" className="text-orange-500 font-semibold text-sm">Dashboard</a>
            <a href="/members" className={`${linkClass} font-medium text-sm transition-colors`}>Membros</a>
            <a href="/memberships" className={`${linkClass} font-medium text-sm transition-colors`}>Matrículas</a>
            <a href="/plans" className={`${linkClass} font-medium text-sm transition-colors`}>Planos</a>
            <a href="/payments" className={`${linkClass} font-medium text-sm transition-colors`}>Financeiro</a>
          </nav>
          <button onClick={toggleDarkMode} className={`p-2 rounded-full transition-colors ${darkMode ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{darkMode ? '☀' : '☾'}</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div><h2 className="text-2xl font-bold">Visão Geral</h2><p className={`text-sm mt-1 ${kpiLabelClass}`}>Acompanhe o desempenho da sua academia.</p></div>
          <div className="flex items-center gap-3">
            <select value={year} onChange={handleYearChange} className={`h-10 pl-3 pr-8 rounded-md border text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all ${darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i + 1).reverse().map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={toggleShowRevenue} className={`h-10 px-4 rounded-md text-sm font-medium transition-all border ${darkMode ? 'border-gray-700 hover:bg-gray-800 text-gray-300' : 'border-gray-300 hover:bg-gray-100 text-gray-600'}`}>{showRevenue ? '👁 Ocultar' : '👁‍🗨 Mostrar'}</button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-lg opacity-50">Carregando dados completos...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <DashboardCard title="Total de Alunos" value={members.length} description={`${activeMembers} ativos agora`} icon={<Users className="w-5 h-5 text-blue-500" />} className={cardClass} />
              <DashboardCard title="Vendas no Ano" value={totalSalesCount} description={`Pagamentos em ${year}`} icon={<CreditCard className="w-5 h-5 text-purple-500" />} className={cardClass} />
              <DashboardCard title="Receita Bruta" value={showRevenue ? formatCurrency(totalRevenue) : "R$ ••••••"} description={`Acumulado de ${year}`} icon={<DollarSign className="w-5 h-5 text-green-500" />} className={cardClass} />
              <DashboardCard title="Ticket Médio" value={showRevenue ? formatCurrency(ticketMedio) : "R$ ••••••"} description="por venda" icon={<TrendingUp className="w-5 h-5 text-orange-500" />} className={cardClass} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className={`rounded-xl shadow-sm border p-6 ${cardClass}`}><div className="flex justify-between items-center mb-6"><h3 className="text-base font-semibold">Receita Mensal</h3><span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700'}`}>Financeiro</span></div><div className="h-64 w-full"><Bar data={revenueChartData} options={commonOptions as any} /></div></div>
              <div className={`rounded-xl shadow-sm border p-6 ${cardClass}`}><div className="flex justify-between items-center mb-6"><h3 className="text-base font-semibold">Evolução de Vendas</h3><span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>Volume</span></div><div className="h-64 w-full"><Line data={salesChartData} options={commonOptions as any} /></div></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`rounded-xl shadow-sm border p-6 ${cardClass}`}><h3 className="text-base font-semibold mb-6">Métodos de Pagamento</h3><div className="h-56 flex justify-center"><Pie data={paymentMethodChartData} options={donutOptions} /></div></div>
              <div className={`rounded-xl shadow-sm border p-6 ${cardClass}`}><h3 className="text-base font-semibold mb-6">Planos Mais Vendidos</h3><div className="h-56 flex justify-center"><Doughnut data={plansChartData} options={donutOptions} /></div></div>
            </div>
          </>
        )}
      </main>

      <footer className={`border-t py-8 mt-12 ${headerClass}`}>
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className={`text-sm ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>© 2025 RLFitness Evolution • Painel Administrativo</p>
        </div>
      </footer>
    </div>
  );
}