import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { Plan } from '../types';

interface PlanFormProps {
	onSave: (plan: Omit<Plan, 'id' | 'is_active'>, id?: string) => Promise<void>;
	editingPlan: Plan | null;
	onCancelEdit: () => void;
}

export function PlanForm({ onSave, editingPlan, onCancelEdit }: PlanFormProps) {
	const { darkMode } = useTheme();
	const [formData, setFormData] = useState({ name: '', price: '', duration_days: '' });
	const [submitting, setSubmitting] = useState(false);
	const nameInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (editingPlan) {
			setFormData({
				name: editingPlan.name,
				price: editingPlan.price.toString(),
				duration_days: editingPlan.duration_days.toString()
			});
			setTimeout(() => nameInputRef.current?.focus(), 100);
		} else {
			setFormData({ name: '', price: '', duration_days: '' });
		}
	}, [editingPlan]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.name || !formData.price || !formData.duration_days) return;
		setSubmitting(true);
		try {
			await onSave({
				name: formData.name,
				price: parseFloat(formData.price),
				duration_days: parseInt(formData.duration_days)
			}, editingPlan?.id);

			if (!editingPlan) {
				setFormData({ name: '', price: '', duration_days: '' });
			}
		} finally {
			setSubmitting(false);
		}
	};

	const inputClass = darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900';
	const cardClass = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';

	return (
		<section className={`mb-8 rounded-xl shadow-sm border p-6 ${cardClass}`}>
			<div className="flex items-center justify-between mb-6">
				<h3 className="text-lg font-semibold flex items-center gap-2">
					{editingPlan ? '✏️ Editar Plano' : 'Criar Novo Plano'}
				</h3>
				{editingPlan && (
					<button onClick={onCancelEdit} className="text-xs text-red-500 hover:underline">
						Cancelar Edição
					</button>
				)}
			</div>

			<form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
				<div>
					<label className="block text-xs font-bold uppercase mb-2 opacity-70">Nome do Plano</label>
					<input ref={nameInputRef} type="text" placeholder="Ex: Mensal..." value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={`w-full h-11 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${inputClass}`} required />
				</div>
				<div>
					<label className="block text-xs font-bold uppercase mb-2 opacity-70">Preço (R$)</label>
					<input type="number" step="0.01" placeholder="0.00" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className={`w-full h-11 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${inputClass}`} required />
				</div>
				<div>
					<label className="block text-xs font-bold uppercase mb-2 opacity-70">Duração (Dias)</label>
					<input type="number" placeholder="30" value={formData.duration_days} onChange={e => setFormData({ ...formData, duration_days: e.target.value })} className={`w-full h-11 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${inputClass}`} required />
				</div>
				<div>
					<button type="submit" disabled={submitting} className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50">
						{editingPlan ? 'Atualizar Plano' : 'Salvar Plano'}
					</button>
				</div>
			</form>
		</section>
	);
}