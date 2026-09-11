import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface EditMemberModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
	memberToEdit: { id: string, name: string, email: string, phone: string, notes: string, rfid_uid?: string } | null;
	darkMode: boolean;
}

export function EditMemberModal({ isOpen, onClose, onSuccess, memberToEdit, darkMode }: EditMemberModalProps) {
	const [submitting, setSubmitting] = useState(false);
	const [loadingTag, setLoadingTag] = useState(false); // Estado para o feedback de captura
	const [formData, setFormData] = useState({
		id: '', name: '', email: '', phone: '', notes: '', rfid_uid: ''
	});

	useEffect(() => {
		if (memberToEdit) {
			setFormData({
				id: memberToEdit.id,
				name: memberToEdit.name,
				email: memberToEdit.email,
				phone: memberToEdit.phone,
				notes: memberToEdit.notes,
				rfid_uid: memberToEdit.rfid_uid || ''
			});
		}
	}, [memberToEdit]);

	// Busca a última tag enviada pela Pico W para o banco
	const capturarTag = async () => {
		setLoadingTag(true);
		try {
			const { data: { session } } = await supabase.auth.getSession();
			if (!session) {
				alert('Sessão expirada. Faça login novamente.');
				return;
			}
			const res = await fetch('/api/get-pending-tag', {
				headers: { Authorization: `Bearer ${session.access_token}` },
			});
			const data = await res.json();

			if (data.rfid_uid) {
				setFormData(prev => ({ ...prev, rfid_uid: data.rfid_uid }));
			} else {
				alert("Nenhuma tag pendente encontrada. Passe a tag no leitor primeiro.");
			}
		} catch (err) {
			console.error("Erro ao capturar tag:", err);
			alert("Erro na comunicação com a API.");
		} finally {
			setLoadingTag(false);
		}
	};

	const handleUpdateMember = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.id) return;
		setSubmitting(true);

		try {
			const { error } = await supabase
				.from('customer')
				.update({
					name: formData.name,
					email: formData.email,
					phone: formData.phone,
					notes: formData.notes,
					rfid_uid: formData.rfid_uid
				})
				.eq('id', formData.id);

			if (error) throw error;
			onSuccess();
			onClose();
		} catch (error: any) {
			alert('Erro ao atualizar: ' + error.message);
		} finally {
			setSubmitting(false);
		}
	};

	if (!isOpen || !memberToEdit) return null;

	const cardClass = darkMode ? 'bg-gray-900 border-gray-800 text-gray-100' : 'bg-white border-gray-200 text-gray-900';
	const inputClass = darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900';
	const btnSecondaryClass = darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600';

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
			<div className={`rounded-xl shadow-2xl w-full max-w-md p-6 ${cardClass} border animate-in fade-in zoom-in duration-200`}>
				<h2 className="text-xl font-bold mb-4">Editar Aluno</h2>
				<form onSubmit={handleUpdateMember} className="space-y-4">

					<div>
						<label className="block text-xs font-bold uppercase mb-1 opacity-70">Nome</label>
						<input
							type="text"
							value={formData.name}
							onChange={e => setFormData({ ...formData, name: e.target.value })}
							className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`}
							required
						/>
					</div>

					{/* CAMPO RFID COM CAPTURA REMOTA */}
					<div>
						<label className="block text-xs font-bold uppercase mb-1 opacity-70">Tag RFID</label>
						<div className="flex gap-2">
							<input
								type="text"
								value={formData.rfid_uid || ''}
								onChange={e => setFormData({ ...formData, rfid_uid: e.target.value })}
								className={`flex-1 border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`}
								placeholder="ID da Tag..."
							/>
							<button
								type="button"
								onClick={capturarTag}
								disabled={loadingTag}
								className={`px-3 rounded-lg border flex items-center justify-center transition-all ${btnSecondaryClass} ${loadingTag ? 'opacity-50' : ''}`}
								title="Sincronizar com o leitor da porta"
							>
								{loadingTag ? (
									<span className="text-[10px] font-bold animate-pulse">LENDO...</span>
								) : (
									<span className="text-[10px] font-bold">CAPTURAR</span>
								)}
							</button>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="block text-xs font-bold uppercase mb-1 opacity-70">Telefone</label>
							<input
								type="text"
								value={formData.phone}
								onChange={e => setFormData({ ...formData, phone: e.target.value })}
								className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`}
							/>
						</div>
						<div>
							<label className="block text-xs font-bold uppercase mb-1 opacity-70">Email</label>
							<input
								type="email"
								value={formData.email}
								onChange={e => setFormData({ ...formData, email: e.target.value })}
								className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`}
							/>
						</div>
					</div>

					<div>
						<label className="block text-xs font-bold uppercase mb-1 opacity-70">Anotações</label>
						<textarea
							rows={3}
							value={formData.notes}
							onChange={e => setFormData({ ...formData, notes: e.target.value })}
							className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputClass}`}
						/>
					</div>

					<div className="flex gap-3 pt-2">
						<button
							type="button"
							onClick={onClose}
							className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${btnSecondaryClass}`}
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={submitting}
							className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50"
						>
							{submitting ? '...' : 'Salvar'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}