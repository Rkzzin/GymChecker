import { Payment, Subscription } from './types';

export const formatCurrency = (value: number) =>
	value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const getMonthlyData = (payments: Payment[], year: number, dataType: 'revenue' | 'count') => {
	const data = new Array(12).fill(0);
	payments.forEach(p => {
		if (!p.payment_date) return;
		const pYear = parseInt(p.payment_date.substring(0, 4));
		const pMonth = parseInt(p.payment_date.substring(5, 7)) - 1;

		if (pYear === year) {
			if (dataType === 'revenue') {
				data[pMonth] += p.amount;
			} else {
				data[pMonth] += 1;
			}
		}
	});
	return data;
};

export const getPaymentMethodsData = (payments: Payment[], year: number) => {
	const methods: { [key: string]: number } = {};
	payments.forEach(p => {
		if (!p.payment_date) return;
		const pYear = parseInt(p.payment_date.substring(0, 4));

		if (pYear === year) {
			const method = p.method ? p.method.charAt(0).toUpperCase() + p.method.slice(1) : 'Outros';
			methods[method] = (methods[method] || 0) + p.amount;
		}
	});
	return { labels: Object.keys(methods), data: Object.values(methods) };
};

export const getPlansData = (subscriptions: Subscription[], year: number) => {
	const planCounts: { [key: string]: number } = {};
	subscriptions.forEach(s => {
		const refDate = s.created_at || s.start_date;
		if (!refDate) return;
		const sYear = parseInt(refDate.substring(0, 4));

		if (sYear === year) {
			const name = s.plan?.name || 'Personalizado';
			planCounts[name] = (planCounts[name] || 0) + 1;
		}
	});

	return {
		labels: Object.keys(planCounts),
		data: Object.values(planCounts)
	};
};