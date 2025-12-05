import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Member, Payment, Subscription, DashboardKPIs } from '../types';
import { useTheme } from '../../../../components/ThemeProvider';

export function useDashboard() {
	const [loading, setLoading] = useState(true);
	const [members, setMembers] = useState<Member[]>([]);
	const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
	const [payments, setPayments] = useState<Payment[]>([]);

	const [year, setYear] = useState<number>(new Date().getFullYear());
	const [showRevenue, setShowRevenue] = useState<boolean>(true);
	const { darkMode } = useTheme();

	// --- Temas ---
	useEffect(() => {
		fetchAllData();
	}, []);

	useEffect(() => {
		localStorage.setItem('darkMode', darkMode.toString());
		if (darkMode) document.documentElement.classList.add('dark');
		else document.documentElement.classList.remove('dark');
	}, [darkMode]);

	// --- Buscas (Recursiva) ---
	const fetchAll = async (table: string, select = '*') => {
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
	};

	const fetchAllData = async () => {
		setLoading(true);
		try {
			const [membersData, subsData, payData] = await Promise.all([
				fetchAll('customer', 'id, name, status'),
				fetchAll('subscription', '*, plan(name)'),
				fetchAll('payment', '*')
			]);
			setMembers(membersData);
			setSubscriptions(subsData);
			setPayments(payData);
		} catch (error) {
			console.error("Erro fatal no dashboard:", error);
		} finally {
			setLoading(false);
		}
	};

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