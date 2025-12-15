import React, { useState, useEffect } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { Payment } from '../types';

interface EditPaymentModalProps {
	isOpen: boolean;
	onClose: () => void;
	payment: Payment;
	onUpdate: (id: string, updates: Partial<Payment>) => Promise<void>;
}

export function EditPaymentModal({ isOpen, onClose, payment, onUpdate }: EditPaymentModalProps) {
	const { darkMode } = useTheme();

	// Estado local para o formulário
	const [formData, setFormData] = useState({
		date: '',
		amount: 0,
		method: '',
		notes: ''
	});

	const [submitting, setSubmitting] = useState(false);

	// Carrega os dados do pagamento quando o modal abre ou o pagamento muda
	useEffect(() => {
		if (payment) {
			// Extrai apenas a parte da data (YYYY-MM-DD) para o input type="date"
			const datePart = new Date(payment.payment_date).toISOString().split('T')[0];

			setFormData({
				date: datePart,
				amount: payment.amount,
				method: payment.method || 'pix',
				notes: payment.notes || ''
			});
		}
	}, [payment]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!payment) return;

		setSubmitting(true);
		try {
			// Reconstrói a data com um horário seguro para evitar problemas de fuso horário
			const safeDate = `${formData.date}T12:00:00.000Z`;

			await onUpdate(payment.id, {
				amount: formData.amount,
				payment_date: safeDate,
				method: formData.method,
				notes: formData.notes
			});

			onClose(); // Fecha o modal após o sucesso
		} catch (error) {
			console.error('Erro ao atualizar pagamento:', error);
			alert('Ocorreu um erro ao salvar as alterações.');
		} finally {
			setSubmitting(false);
		}
	};

	if (!isOpen || !payment) return null;

	const cardClass = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
	const inputClass = darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900';

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all">
			<div className={`rounded-xl shadow-2xl w-full max-w-md p-6 ${cardClass} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>

				<div className="mb-6">
					<h2 className="text-xl font-bold">Editar Lançamento</h2>
					<p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
						Aluno: <span className="font-medium text-orange-500">{payment.customer?.name || 'Desconhecido'}</span>
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-5">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-xs font-semibold uppercase mb-1.5 opacity-70">Data</label>
							<input
								type="date"
								value={formData.date}
								onChange={e => setFormData({ ...formData, date: e.target.value })}
								className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${inputClass}`}
								required
							/>
						</div>
						<div>
							<label className="block text-xs font-semibold uppercase mb-1.5 opacity-70">Valor (R$)</label>
							<input
								type="number"
								step="0.01"
								value={formData.amount}
								onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
								className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${inputClass}`}
								required
							/>
						</div>
					</div>

					<div>
						<label className="block text-xs font-semibold uppercase mb-1.5 opacity-70">Forma de Pagamento</label>
						<select
							value={formData.method}
							onChange={e => setFormData({ ...formData, method: e.target.value })}
							className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${inputClass}`}
						>
							<option value="pix">Pix</option>
							<option value="dinheiro">Dinheiro</option>
							<option value="transferencia">Transferência</option>
						</select>
					</div>

					<div>
						<label className="block text-xs font-semibold uppercase mb-1.5 opacity-70">Observações</label>
						<textarea
							rows={3}
							value={formData.notes}
							onChange={e => setFormData({ ...formData, notes: e.target.value })}
							className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${inputClass}`}
							placeholder="Ex: Valor ajustado..."
						/>
					</div>

					<div className="flex gap-3 pt-2">
						<button
							type="button"
							onClick={onClose}
							className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={submitting}
							className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-lg font-bold shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50"
						>
							{submitting ? 'Salvando...' : 'Confirmar'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}