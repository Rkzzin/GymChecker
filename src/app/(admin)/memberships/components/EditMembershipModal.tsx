import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MembershipToEdit } from '../types';
import { toast } from 'sonner';

interface EditMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (memberId: string) => void;
  membershipToEdit: MembershipToEdit | null;
  darkMode: boolean;
}

export function EditMembershipModal({ isOpen, onClose, onSuccess, membershipToEdit, darkMode }: EditMembershipModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [dates, setDates] = useState({ startDate: '', endDate: '' });

  // Inicializa o form quando o membershipToEdit muda
  useEffect(() => {
    if (membershipToEdit) {
      setDates({
        startDate: new Date(membershipToEdit.rawStartDate).toISOString().split('T')[0],
        endDate: new Date(membershipToEdit.rawEndDate).toISOString().split('T')[0]
      });
    }
  }, [membershipToEdit]);

  const handleUpdateMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!membershipToEdit) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('subscription')
        .update({
          start_date: dates.startDate,
          end_date: dates.endDate
        })
        .eq('id', membershipToEdit.id);

      if (error) throw error;

      onSuccess(membershipToEdit.memberId);
      onClose();
    } catch (error: any) {
      toast.error('Erro ao atualizar datas: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !membershipToEdit) return null;

  const cardClass = darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200';
  const inputClass = darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all">
      <div className={`rounded-xl shadow-2xl w-full max-w-md p-6 border ${cardClass} animate-in zoom-in-95 duration-200`}>
        <div className="mb-6">
          <h2 className="text-xl font-bold">Editar Vigência</h2>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Aluno: <span className="font-medium text-orange-500">{membershipToEdit.memberName}</span>
          </p>
        </div>

        <form onSubmit={handleUpdateMembership} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase mb-1.5 opacity-70">Data de Início</label>
              <input
                type="date"
                value={dates.startDate}
                onChange={e => setDates({ ...dates, startDate: e.target.value })}
                className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${inputClass}`}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase mb-1.5 opacity-70">Data de Fim</label>
              <input
                type="date"
                value={dates.endDate}
                onChange={e => setDates({ ...dates, endDate: e.target.value })}
                className={`w-full border p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${inputClass}`}
                required
              />
            </div>
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
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {submitting ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}