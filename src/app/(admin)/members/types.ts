export type { Plan } from '@/lib/types/plan';

export interface MemberWithMembership {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  rfid_uid?: string | null;
  status: 'active' | 'archived';
  startDate: string | null;
  endDate: string | null;
  rawEndDate: string | null;
  isInactive: boolean;
  lastPlanName?: string;
  lastPlanId?: string;
}