'use client';

import { useAuthGuard } from '../hooks/useAuth';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// Interfaces
interface Plan {
	id: string;
	name: string;
	price: number;
	duration_days: number;
	is_active: boolean;
}

export default function Plans() {
	useAuthGuard();

	const [plans, setPlans] = useState<Plan[]>([]);
	const [loading, setLoading] = useState(false);
	const [darkMode, setDarkMode] = useState(false);

	// Edição / Criação
	const [isEditing, setIsEditing] = useState<string | null>(null);
	const [formData, setFormData] = useState({
		name: '',
		price: '',
		duration_days: ''
	});

	const nameInputRef = useRef<HTMLInputElement>(null);

	// --- Efeitos ---
	useEffect(() => {
		const savedTheme = localStorage.getItem('darkMode');
		if (savedTheme !== null) setDarkMode(savedTheme === 'true');
		fetchPlans();
	}, []);

	useEffect(() => {
		localStorage.setItem('darkMode', darkMode.toString());
		if (darkMode) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}, [darkMode]);

	const toggleDarkMode = () => setDarkMode(!darkMode);

	// --- Buscas ---
	const fetchPlans = async () => {
		setLoading(true);
		try {
			const { data, error } = await supabase
				.from('plan')
				.select('*')
				.order('is_active', { ascending: false })
				.order('price', { ascending: true });

			if (error) throw error;
			if (data) setPlans(data);
		} catch (error) {
			console.error('Erro ao buscar planos:', error);
		} finally {
			setLoading(false);
		}
	};

	// --- Ações ---
	const handleSavePlan = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.name || !formData.price || !formData.duration_days) return;

		const payload = {
			name: formData.name,
			price: parseFloat(formData.price),
			duration_days: parseInt(formData.duration_days),
			is_active: true
		};

		try {
			if (isEditing) {
				const { error } = await supabase
					.from('plan')
					.update(payload)
					.eq('id', isEditing);

				if (error) throw error;
			} else {
				const { error } = await supabase
					.from('plan')
					.insert([payload]);

				if (error) throw error;
			}

			setFormData({ name: '', price: '', duration_days: '' });
			setIsEditing(null);
			fetchPlans();

		} catch (error) {
			console.error('Erro ao salvar plano:', error);
			alert('Erro ao salvar o plano.');
		}
	};

	const handleEditClick = (plan: Plan) => {
		setIsEditing(plan.id);
		setFormData({
			name: plan.name,
			price: plan.price.toString(),
			duration_days: plan.duration_days.toString()
		});
		setTimeout(() => nameInputRef.current?.focus(), 100);
	};

	const handleCancelEdit = () => {
		setIsEditing(null);
		setFormData({ name: '', price: '', duration_days: '' });
	};

	const handleToggleStatus = async (plan: Plan) => {
		try {
			const { error } = await supabase
				.from('plan')
				.update({ is_active: !plan.is_active })
				.eq('id', plan.id);

			if (error) throw error;

			setPlans(prev => prev.map(p =>
				p.id === plan.id ? { ...p, is_active: !p.is_active } : p
			));
		} catch (error) {
			console.error('Erro ao alterar status:', error);
		}
	};

	// --- Estilos ---
	const bgClass = darkMode ? 'bg-black text-gray-100' : 'bg-gray-50 text-gray-900';
	const cardClass = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
	const headerClass = darkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-200';
	const linkClass = darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900';
	const inputClass = darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900';

	return (
		<div className={`min-h-screen ${bgClass} transition-colors duration-300`}>
			{/* Header */}
			<header className={`sticky top-0 z-30 border-b ${headerClass} backdrop-blur-md bg-opacity-95`}>
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
					<div className="flex items-center gap-2 select-none">
						<h1 className="text-xl font-bold tracking-tight">
							<span className="text-orange-500">RLFITNESS</span>
							<span className={`${darkMode ? 'text-white' : 'text-gray-900'} mx-1`}>|</span>
							<span className={darkMode ? 'text-gray-200' : 'text-gray-800'}>EVOLUTION</span>
						</h1>
					</div>

					<nav className="hidden md:flex space-x-8">
						<a href="/dashboard" className={`${linkClass} font-medium text-sm transition-colors`}>Dashboard</a>
						<a href="/members" className={`${linkClass} font-medium text-sm transition-colors`}>Membros</a>
						<a href="/memberships" className={`${linkClass} font-medium text-sm transition-colors`}>Matrículas</a>
						<a href="/plans" className="text-orange-500 font-semibold text-sm">Planos</a>
						<a href="/payments" className={`${linkClass} font-medium text-sm transition-colors`}>Financeiro</a>
					</nav>

					<button
						onClick={toggleDarkMode}
						className={`p-2 rounded-full transition-colors ${darkMode ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
					>
						{darkMode ? '☀' : '☾'}
					</button>
				</div>
			</header>

			<main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

				{/* Título */}
				<div className="mb-8">
					<h2 className="text-2xl font-bold">Gestão de Planos</h2>
					<p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
						Crie e configure os pacotes oferecidos pela academia.
					</p>
				</div>

				{/* Formulário de Criação / Edição */}
				<section className={`mb-8 rounded-xl shadow-sm border p-6 ${cardClass}`}>
					<div className="flex items-center justify-between mb-6">
						<h3 className="text-lg font-semibold flex items-center gap-2">
							{isEditing ? '✏️ Editar Plano' : 'Criar Novo Plano'}
						</h3>
						{isEditing && (
							<button
								onClick={handleCancelEdit}
								className="text-xs text-red-500 hover:underline"
							>
								Cancelar Edição
							</button>
						)}
					</div>

					<form onSubmit={handleSavePlan} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
						<div>
							<label className="block text-xs font-bold uppercase mb-2 opacity-70">Nome do Plano</label>
							<input
								ref={nameInputRef}
								type="text"
								placeholder="Ex: Mensal, Trimestral..."
								value={formData.name}
								onChange={e => setFormData({ ...formData, name: e.target.value })}
								className={`w-full h-11 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${inputClass}`}
								required
							/>
						</div>
						<div>
							<label className="block text-xs font-bold uppercase mb-2 opacity-70">Preço (R$)</label>
							<input
								type="number"
								step="0.01"
								placeholder="0.00"
								value={formData.price}
								onChange={e => setFormData({ ...formData, price: e.target.value })}
								className={`w-full h-11 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${inputClass}`}
								required
							/>
						</div>
						<div>
							<label className="block text-xs font-bold uppercase mb-2 opacity-70">Duração (Dias)</label>
							<input
								type="number"
								placeholder="30"
								value={formData.duration_days}
								onChange={e => setFormData({ ...formData, duration_days: e.target.value })}
								className={`w-full h-11 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${inputClass}`}
								required
							/>
						</div>
						<div>
							<button
								type="submit"
								disabled={loading}
								className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isEditing ? 'Atualizar Plano' : 'Salvar Plano'}
							</button>
						</div>
					</form>
				</section>

				{/* Lista de Planos */}
				<section className={`rounded-xl shadow-sm border overflow-hidden ${cardClass}`}>
					<table className="w-full text-sm">
						<thead className={`border-b ${darkMode ? 'bg-gray-800/50 border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
							<tr>
								<th className="px-6 py-4 text-left font-semibold">Nome</th>
								<th className="px-6 py-4 text-left font-semibold">Preço</th>
								<th className="px-6 py-4 text-left font-semibold">Duração</th>
								<th className="px-6 py-4 text-center font-semibold">Status</th>
								<th className="px-6 py-4 text-center font-semibold">Ações</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200 dark:divide-gray-800">
							{loading ? (
								<tr><td colSpan={5} className="p-8 text-center text-gray-500">Carregando...</td></tr>
							) : plans.length === 0 ? (
								<tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum plano cadastrado.</td></tr>
							) : (
								plans.map(plan => (
									<tr key={plan.id} className={`group ${darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'} transition-colors`}>
										<td className="px-6 py-4 font-medium text-base">{plan.name}</td>
										<td className="px-6 py-4 text-orange-500 font-bold">R$ {plan.price.toFixed(2)}</td>
										<td className="px-6 py-4 text-gray-500">{plan.duration_days} dias</td>
										<td className="px-6 py-4 text-center">
											<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${plan.is_active
													? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
													: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
												}`}>
												{plan.is_active ? 'Ativo' : 'Inativo'}
											</span>
										</td>
										<td className="px-6 py-4 text-center">
											<div className="flex justify-center gap-3">
												<button
													onClick={() => handleEditClick(plan)}
													className="text-gray-400 hover:text-blue-500 transition-colors p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
													title="Editar"
												>
													✏️
												</button>
												<button
													onClick={() => handleToggleStatus(plan)}
													className={`p-1.5 rounded-md transition-colors ${plan.is_active
															? 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
															: 'text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
														}`}
													title={plan.is_active ? "Desativar" : "Ativar"}
												>
													{plan.is_active ? '🚫' : '✅'}
												</button>
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</section>

			</main>

			<footer className={`border-t py-8 mt-12 ${headerClass}`}>
				<div className="max-w-7xl mx-auto px-4 text-center">
					<p className={`text-sm ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
						© 2025 RLFitness Evolution • Painel Administrativo
					</p>
				</div>
			</footer>
		</div>
	);
}