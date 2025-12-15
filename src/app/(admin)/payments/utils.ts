export const formatCurrency = (value: number) => 
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const getMethodBadgeClass = (method: string) => {
  switch (method.toLowerCase()) {
    case 'pix': return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400';
    case 'dinheiro': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'transferencia': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
  }
};