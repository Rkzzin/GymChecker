'use client';
import React, { useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { usePayments } from './hooks/usePayments';
import { PaymentsToolbar } from './components/PaymentsToolbar';
import { PaymentsTable } from './components/PaymentsTable';
import { EditPaymentModal } from './components/EditPaymentModal';
import { Payment } from './types';

export default function PaymentsPage() {
  const { darkMode } = useTheme();
  const { payments, loading, monthFilter, setMonthFilter, yearFilter, setYearFilter, updatePayment } = usePayments();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [paymentToEdit, setPaymentToEdit] = useState<Payment | null>(null);

  const totalMonth = payments.reduce((acc, curr) => acc + curr.amount, 0);

  const handleEditClick = (payment: Payment) => {
    setPaymentToEdit(payment);
    setIsEditModalOpen(true);
  };

  return (
    <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
         <h2 className="text-2xl font-bold">Livro Caixa</h2>
         <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Gerencie e audite todas as entradas financeiras.</p>
      </div>

      <PaymentsToolbar 
         total={totalMonth} 
         month={monthFilter} 
         year={yearFilter} 
         setMonth={setMonthFilter} 
         setYear={setYearFilter} 
      />

      <PaymentsTable 
         payments={payments} 
         loading={loading} 
         onEdit={handleEditClick} 
      />

      {isEditModalOpen && paymentToEdit && (
        <EditPaymentModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          payment={paymentToEdit}
          onUpdate={updatePayment}
        />
      )}
    </main>
  );
}