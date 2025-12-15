export const formatCurrency = (value: number) => 
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const getStatusBadgeClass = (isActive: boolean) => {
  return isActive 
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
};