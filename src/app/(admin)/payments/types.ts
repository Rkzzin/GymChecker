export interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  method: string;
  notes: string | null;
  customer: { name: string };
}