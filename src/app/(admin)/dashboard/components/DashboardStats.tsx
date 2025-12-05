import React from 'react';
import { DashboardCard } from '@/components/DashboardCard';
import { Users, CreditCard, DollarSign, TrendingUp } from "lucide-react";
import { formatCurrency } from '../utils';
import { DashboardKPIs } from '../types';

interface DashboardStatsProps {
	kpis: DashboardKPIs;
	membersCount: number;
	year: number;
	showRevenue: boolean;
	cardClass: string;
}

export function DashboardStats({ kpis, membersCount, year, showRevenue, cardClass }: DashboardStatsProps) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
			<DashboardCard
				title="Total de Alunos"
				value={membersCount}
				description={`${kpis.activeMembers} ativos agora`}
				icon={<Users className="w-5 h-5 text-blue-500" />}
				className={cardClass}
			/>
			<DashboardCard
				title="Vendas no Ano"
				value={kpis.totalSalesCount}
				description={`Pagamentos em ${year}`}
				icon={<CreditCard className="w-5 h-5 text-purple-500" />}
				className={cardClass}
			/>
			<DashboardCard
				title="Receita Bruta"
				value={showRevenue ? formatCurrency(kpis.totalRevenue) : "R$ ••••••"}
				description={`Acumulado de ${year}`}
				icon={<DollarSign className="w-5 h-5 text-green-500" />}
				className={cardClass}
			/>
			<DashboardCard
				title="Ticket Médio"
				value={showRevenue ? formatCurrency(kpis.ticketMedio) : "R$ ••••••"}
				description="por venda"
				icon={<TrendingUp className="w-5 h-5 text-orange-500" />}
				className={cardClass}
			/>
		</div>
	);
}