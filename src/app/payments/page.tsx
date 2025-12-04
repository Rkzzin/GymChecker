'use client';

import { useAuthGuard } from '../hooks/useAuth';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Interfaces
interface Payment {
	id: string;
	amount: number;
	payment_date: string;
	method: string;
	notes: string | null;
	customer: { name: string; };
}

export default function Payments() {
	useAuthGuard();

	const [payments, setPayments] = useState<Payment[]>([]);
	const [loading, setLoading] = useState(false);
	const [darkMode, setDarkMode] = useState(false);
	const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
	const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

	// Edição
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [paymentToEdit, setPaymentToEdit] = useState<{ id: string; amount: number; payment_date: string; method: string; notes: string; customerName: string; } | null>(null);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		const savedTheme = localStorage.getItem('darkMode');
		if (savedTheme !== null) setDarkMode(savedTheme === 'true');
	}, []);

	useEffect(() => {
		localStorage.setItem('darkMode', darkMode.toString());
		if (darkMode) document.documentElement.classList.add('dark');
		else document.documentElement.classList.remove('dark');
	}, [darkMode]);

	useEffect(() => { fetchPayments(); }, [monthFilter, yearFilter]);
	const toggleDarkMode = () => setDarkMode(!darkMode);

	// --- BUSCA CORRIGIDA PARA EVITAR ERRO DE FUSO ---
	const fetchPayments = async () => {
		setLoading(true);
		try {
			// Constrói a string manualmente para garantir 00:00:00 UTC
			const y = yearFilter;
			const m = String(monthFilter).padStart(2, '0');

			// Início: 01 do mês atual
			const startDate = `${y}-${m}-01T00:00:00.000Z`;

			// Fim: 01 do mês seguinte (usando less-than para pegar até o último ms do mês atual)
			let nextM = monthFilter + 1;
			let nextY = yearFilter;
			if (nextM > 12) { nextM = 1; nextY++; }
			const endDate = `${nextY}-${String(nextM).padStart(2, '0')}-01T00:00:00.000Z`;

			const { data, error } = await supabase
				.from('payment')
				.select(`id, amount, payment_date, method, notes, customer (name)`)
				.gte('payment_date', startDate)
				.lt('payment_date', endDate) // Menor que dia 1 do próximo mês
				.order('payment_date', { ascending: false });

			if (error) throw error;
			setPayments(data as any);
		} catch (error) {
			console.error('Erro ao buscar pagamentos:', error);
		} finally {
			setLoading(false);
		}
	};

	// --- Ações ---
	const openEditModal = (payment: any) => {
		const datePart = new Date(payment.payment_date).toISOString().split('T')[0];
		setPaymentToEdit({
			id: payment.id,
			amount: payment.amount,
			payment_date: datePart,
			method: payment.method || 'pix',
			notes: payment.notes || '',
			customerName: payment.customer?.name || 'Desconhecido'
		});
		setIsEditModalOpen(true);
	};

	const handleUpdatePayment = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!paymentToEdit) return;
		setSubmitting(true);

		try {
			// Ao salvar, força meio-dia UTC para evitar rolagens
			const safeDate = `${paymentToEdit.payment_date}T12:00:00.000Z`;

			const { error } = await supabase
				.from('payment')
				.update({
					amount: paymentToEdit.amount,
					payment_date: safeDate,
					method: paymentToEdit.method,
					notes: paymentToEdit.notes
				})
				.eq('id', paymentToEdit.id);

			if (error) throw error;
			setIsEditModalOpen(false);
			setPaymentToEdit(null);
			fetchPayments();
		} catch (error: any) {
			alert('Erro ao atualizar: ' + error.message);
		} finally {
			setSubmitting(false);
		}
	};

	// Estilos
	const getMethodBadgeClass = (method: string) => {
		switch (method.toLowerCase()) {
			case 'pix': return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400';
			case 'dinheiro': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
			case 'transferencia': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
			default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
		}
	};
	const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

	const bgClass = darkMode ? 'bg-black text-gray-100' : 'bg-gray-50 text-gray-900';
	const cardClass = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
	const headerClass = darkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-200';
	const linkClass = darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900';
	const inputClass = darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900';
	const totalMonth = payments.reduce((acc, curr) => acc + curr.amount, 0);

	return (
		<div className={`min-h-screen ${bgClass} transition-colors duration-300`}>
			<header className={`sticky top-0 z-30 border-b ${headerClass} backdrop-blur-md bg-opacity-95`}>
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
					<div className="flex items-center gap-2 select-none">
						<h1 className="text-xl font-bold tracking-tight"><span className="text-orange-500">RLFITNESS</span><span className={`${darkMode ? 'text-white' : 'text-gray-900'} mx-1`}>|</span><span className={darkMode ? 'text-gray-200' : 'text-gray-800'}>EVOLUTION</span></h1>
					</div>
					<nav className="hidden md:flex space-x-8">
						<a href="/dashboard" className={`${linkClass} font-medium text-sm transition-colors`}>Dashboard</a>
						<a href="/members" className={`${linkClass} font-medium text-sm transition-colors`}>Membros</a>
						<a href="/memberships" className={`${linkClass} font-medium text-sm transition-colors`}>Matrículas</a>
						<a href="/plans" className={`${linkClass} font-medium text-sm transition-colors`}>Planos</a>
						<a href="/payments" className="text-orange-500 font-semibold text-sm">Financeiro</a>
					</nav>
					<button onClick={toggleDarkMode} className={`p-2 rounded-full transition-colors ${darkMode ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{darkMode ? '☀' : '☾'}</button>
				</div>
			</header>

			<main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
					<div><h2 className="text-2xl font-bold">Livro Caixa</h2><p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Gerencie e audite todas as entradas financeiras.</p></div>
					<div className={`flex items-center gap-4 px-4 py-3 rounded-lg border ${cardClass}`}><div className="text-sm font-medium opacity-70">Total do Período</div><div className="text-xl font-bold text-green-500">{formatCurrency(totalMonth)}</div></div>
				</div>

				<div className="flex justify-end gap-3 mb-6">
					<select value={monthFilter} onChange={(e) => setMonthFilter(parseInt(e.target.value))} className={`h-10 pl-3 pr-8 rounded-md border text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all ${inputClass}`}>
						{Array.from({ length: 12 }, (_, i) => (<option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}</option>))}
					</select>
					<select value={yearFilter} onChange={(e) => setYearFilter(parseInt(e.target.value))} className={`h-10 pl-3 pr-8 rounded-md border text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all ${inputClass}`}>
						{[2023, 2024, 2025, 2026].map(y => (<option key={y} value={y}>{y}</option>))}
					</select>
				</div>

				<div className={`rounded-xl shadow-sm border overflow-hidden ${cardClass}`}>
					<table className="w-full text-sm">
						<thead className={`border-b ${darkMode ? 'bg-gray-800/50 border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
							<tr><th className="px-6 py-3 text-left font-semibold">Data</th><th className="px-6 py-3 text-left font-semibold">Aluno</th><th className="px-6 py-3 text-left font-semibold">Valor</th><th className="px-6 py-3 text-left font-semibold">Método</th><th className="px-6 py-3 text-left font-semibold">Obs</th><th className="px-6 py-3 text-center font-semibold">Ações</th></tr>
						</thead>
						<tbody className="divide-y divide-gray-200 dark:divide-gray-800">
							{loading ? (<tr><td colSpan={6} className="p-8 text-center text-gray-500">Carregando dados...</td></tr>) : payments.length === 0 ? (<tr><td colSpan={6} className="p-8 text-center text-gray-500">Nenhum pagamento encontrado neste período.</td></tr>) : (
								payments.map(pay => (
									<tr key={pay.id} className={`group ${darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'} transition-colors`}>
										<td className="px-6 py-4 whitespace-nowrap opacity-80">{new Date(pay.payment_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
										<td className="px-6 py-4 font-medium">{pay.customer?.name || 'Desconhecido'}</td>
										<td className="px-6 py-4 font-bold text-green-600 dark:text-green-400">{formatCurrency(pay.amount)}</td>
										<td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${getMethodBadgeClass(pay.method || '')}`}>{pay.method}</span></td>
										<td className="px-6 py-4 text-xs italic opacity-60 max-w-xs truncate">{pay.notes || '-'}</td>
										<td className="px-6 py-4 text-center">
											<button onClick={() => openEditModal(pay)} className="text-gray-400 hover:text-orange-500 transition-colors p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800" title="Editar Lançamento">✏️</button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</main>

			{isEditModalOpen && paymentToEdit && (
				<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all">
					<div className={`rounded-xl shadow-2xl w-full max-w-md p-6 ${cardClass} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
						<div className="mb-6"><h2 className="text-xl font-bold">Editar Lançamento</h2><p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Aluno: <span className="font-medium text-orange-500">{paymentToEdit.customerName}</span></p></div>
						<form onSubmit={handleUpdatePayment} className="space-y-5">
							<div className="grid grid-cols-2 gap-4">
								<div><label className="block text-xs font-semibold uppercase mb-1.5 opacity-70">Data</label><input type="date" value={paymentToEdit.payment_date} onChange={e => setPaymentToEdit({ ...paymentToEdit, payment_date: e.target.value })} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${inputClass}`} required /></div>
								<div><label className="block text-xs font-semibold uppercase mb-1.5 opacity-70">Valor (R$)</label><input type="number" step="0.01" value={paymentToEdit.amount} onChange={e => setPaymentToEdit({ ...paymentToEdit, amount: parseFloat(e.target.value) })} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${inputClass}`} required /></div>
							</div>
							<div><label className="block text-xs font-semibold uppercase mb-1.5 opacity-70">Forma de Pagamento</label><select value={paymentToEdit.method} onChange={e => setPaymentToEdit({ ...paymentToEdit, method: e.target.value })} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${inputClass}`}><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="transferencia">Transferência</option></select></div>
							<div><label className="block text-xs font-semibold uppercase mb-1.5 opacity-70">Observações</label><textarea rows={3} value={paymentToEdit.notes} onChange={e => setPaymentToEdit({ ...paymentToEdit, notes: e.target.value })} className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${inputClass}`} placeholder="Ex: Valor ajustado..." /></div>
							<div className="flex gap-3 pt-2"><button type="button" onClick={() => setIsEditModalOpen(false)} className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>Cancelar</button><button type="submit" disabled={submitting} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-lg font-bold shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">{submitting ? 'Salvando...' : 'Confirmar'}</button></div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}