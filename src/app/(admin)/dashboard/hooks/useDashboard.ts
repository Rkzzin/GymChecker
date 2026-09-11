import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Member, Payment, Subscription, DashboardKPIs } from '../types';
import { useTheme } from '../../../../components/ThemeProvider';

// Helper de paginação puro, fora do componente — não referencia estado do
// hook, então não precisa ser recriado a cada render nem entrar em
// dependência de useEffect.
async function fetchAllRows(table: string, select = '*') {
	let allData: any[] = [];
	let from = 0;
	const step = 1000;
	while (true) {
		const { data, error } = await supabase.from(table).select(select).range(from, from + step - 1);
		if (error) { console.error(`Erro buscando ${table}:`, error); break; }
		if (!data || data.length === 0) break;
		allData = [...allData, ...data];
		if (data.length < step) break;
		from += step;
	}
	return allData;
}

export function useDashboard() {
	const [loading, setLoading] = useState(true);
	const [members, setMembers] = useState<Member[]>([]);
	const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
	const [payments, setPayments] = useState<Payment[]>([]);

	const [year, setYear] = useState<number>(new Date().getFullYear());
	const [showRevenue, setShowRevenue] = useState<boolean>(true);
	const { darkMode } = useTheme();

	// --- Carga inicial ---
	// A função de fetch fica declarada dentro do efeito: setState aqui é
	// resultado de uma operação assíncrona (não síncrono), então não conta
	// para react-hooks/set-state-in-effect — só é sinalizado quando o
	// linter vê uma função externa memoizada sendo chamada diretamente no
	// corpo do efeito.
	useEffect(() => {
		let cancelled = false;

		const fetchAllData = async () => {
			setLoading(true);
			try {
				const [membersData, subsData, payData] = await Promise.all([
					fetchAllRows('customer', 'id, name, status'),
					fetchAllRows('subscription', '*, plan(name)'),
					fetchAllRows('payment', '*')
				]);
				if (cancelled) return;
				setMembers(membersData);
				setSubscriptions(subsData);
				setPayments(payData);
			} catch (error) {
				console.error("Erro fatal no dashboard:", error);
			} finally {
				if (!cancelled) setLoading(false);
			}
		};

		fetchAllData();

		return () => {
			cancelled = true;
		};
	}, []);

	// --- Tema ---
	useEffect(() => {
		localStorage.setItem('darkMode', darkMode.toString());
		if (darkMode) document.documentElement.classList.add('dark');
		else document.documentElement.classList.remove('dark');
	}, [darkMode]);

	// --- Cálculos de KPIs (Memoizados) ---
	const kpis: DashboardKPIs = useMemo(() => {
		const yearStr = year.toString();
		const yearPayments = payments.filter(p => p.payment_date?.substring(0, 4) === yearStr);

		const salesCount = yearPayments.length;
		const revenue = yearPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
		const activeCount = members.filter(m => m.status === 'active').length;

		return {
			totalSalesCount: salesCount,
			totalRevenue: revenue,
			ticketMedio: salesCount > 0 ? revenue / salesCount : 0,
			activeMembers: activeCount
		};
	}, [payments, members, year]);

	return {
		// Dados Brutos
		members, subscriptions, payments,
		// KPIs Calculados
		kpis,
		// Estado UI
		loading, year, setYear,
		showRevenue, setShowRevenue,
		darkMode
	};
}
