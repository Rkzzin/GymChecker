'use client';

import { useDashboard } from './hooks/useDashboard';
import { useTheme } from '@/components/ThemeProvider'; // Importar o contexto global

// Componentes
import { DashboardStats } from './components/DashboardStats';
import { RevenueChart } from './components/RevenueChart';
import { SalesChart } from './components/SalesChart';
import { PaymentMethodChart } from './components/PaymentMethodChart';
import { PlansChart } from './components/PlansChart';

export default function Dashboard() {
  const {
    members, subscriptions, payments, kpis,
    loading, year, setYear,
    showRevenue, setShowRevenue
  } = useDashboard();

  const { darkMode } = useTheme();
  const cardClass = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';

  return (
    <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold">Visão Geral</h2>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Acompanhe o desempenho da sua academia.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={year} 
            onChange={(e) => setYear(parseInt(e.target.value))} 
            className={`h-10 pl-3 pr-8 rounded-md border text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all ${darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i + 1).reverse().map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button 
            onClick={() => setShowRevenue(!showRevenue)} 
            className={`h-10 px-4 rounded-md text-sm font-medium transition-all border ${darkMode ? 'border-gray-700 hover:bg-gray-800 text-gray-300' : 'border-gray-300 hover:bg-gray-100 text-gray-600'}`}
          >
            {showRevenue ? '👁 Ocultar' : '👁‍🗨 Mostrar'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-lg opacity-50">Carregando dados completos...</div>
      ) : (
        <>
          <DashboardStats 
            kpis={kpis} 
            membersCount={members.length} 
            year={year} 
            showRevenue={showRevenue} 
            cardClass={cardClass} 
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className={`rounded-xl shadow-sm border p-6 ${cardClass}`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-semibold">Receita Mensal</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700'}`}>Financeiro</span>
              </div>
              <div className="h-64 w-full"><RevenueChart data={payments} year={year} /></div>
            </div>
            <div className={`rounded-xl shadow-sm border p-6 ${cardClass}`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-semibold">Evolução de Vendas</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>Volume</span>
              </div>
              <div className="h-64 w-full"><SalesChart data={payments} year={year} /></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`rounded-xl shadow-sm border p-6 ${cardClass}`}>
              <h3 className="text-base font-semibold mb-6">Métodos de Pagamento</h3>
              <div className="h-56 flex justify-center"><PaymentMethodChart data={payments} year={year} /></div>
            </div>
            <div className={`rounded-xl shadow-sm border p-6 ${cardClass}`}>
              <h3 className="text-base font-semibold mb-6">Planos Mais Vendidos</h3>
              <div className="h-56 flex justify-center"><PlansChart data={subscriptions} year={year} /></div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}