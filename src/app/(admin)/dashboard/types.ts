export interface Subscription {
  id: string;
  customer_id: string;
  start_date: string;
  end_date: string;
  created_at: string;
  plan?: { name: string };
}

export interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  method: string;
}

export interface Member {
  id: string;
  name: string;
  status: string;
}

export interface DashboardKPIs {
  totalSalesCount: number;
  totalRevenue: number;
  activeMembers: number;
  ticketMedio: number;
}