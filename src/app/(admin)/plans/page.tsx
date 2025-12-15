'use client';
import React, { useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { usePlans } from './hooks/usePlans';
import { PlanForm } from './components/PlanForm';
import { PlansTable } from './components/PlansTable';
import { Plan } from './types';

export default function PlansPage() {
  const { darkMode } = useTheme();
  const { plans, loading, savePlan, toggleStatus } = usePlans();
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  return (
    <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Gestão de Planos</h2>
        <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Crie e configure os pacotes oferecidos pela academia.
        </p>
      </div>

      <PlanForm 
        onSave={savePlan} 
        editingPlan={editingPlan} 
        onCancelEdit={() => setEditingPlan(null)} 
      />

      <PlansTable 
        plans={plans} 
        loading={loading} 
        onEdit={setEditingPlan} 
        onToggleStatus={toggleStatus} 
      />
    </main>
  );
}