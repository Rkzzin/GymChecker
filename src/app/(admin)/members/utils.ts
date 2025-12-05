import { MemberWithMembership } from './types';

// Calcula se a data de vencimento passou há mais de 5 dias
export const isInactiveMoreThan5Days = (endDateIso: string | null): boolean => {
	if (!endDateIso) return false;
	const end = new Date(endDateIso);
	const now = new Date();
	const diffTime = now.getTime() - end.getTime();
	// Diferença em dias
	return Math.floor(diffTime / (1000 * 3600 * 24)) > 5;
};

// Verifica se está no intervalo de vencimento (venceu há pouco ou vai vencer em 3 dias)
export const isWithinExpirationRange = (endDateStr: string | null): boolean => {
	if (!endDateStr) return false;
	const [day, month, year] = endDateStr.split('/').map(Number);
	const endDate = new Date(year, month - 1, day);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const timeDiff = endDate.getTime() - today.getTime();
	const diffDays = Math.floor(timeDiff / (1000 * 3600 * 24));
	return diffDays >= -5 && diffDays <= 3;
};

// Lógica de ordenação complexa
export const sortMembersData = (
	data: MemberWithMembership[],
	field: string,
	dir: 'asc' | 'desc'
): MemberWithMembership[] => {
	return [...data].sort((a, b) => {
		const direction = dir === 'asc' ? 1 : -1;

		if (field === 'endDate' || field === 'startDate') {
			const valA = field === 'endDate'
				? (a.rawEndDate ? new Date(a.rawEndDate).getTime() : (direction === 1 ? Infinity : -Infinity))
				: (a.startDate ? new Date(a.startDate.split('/').reverse().join('-')).getTime() : 0);

			const valB = field === 'endDate'
				? (b.rawEndDate ? new Date(b.rawEndDate).getTime() : (direction === 1 ? Infinity : -Infinity))
				: (b.startDate ? new Date(b.startDate.split('/').reverse().join('-')).getTime() : 0);

			return direction * (valA - valB);
		}

		return direction * a.name.localeCompare(b.name);
	});
};