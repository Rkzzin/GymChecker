export interface Plan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
}

export interface MemberWithMembership {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: 'active' | 'archived';
  startDate: string | null;
  endDate: string | null;
  rawEndDate: string | null;
  isInactive: boolean;
  lastPlanName?: string;
  lastPlanId?: string;
}