export interface AccessLog {
  id: string;
  customer_id: string | null;
  customer_name: string;
  rfid_uid: string;
  allowed: boolean;
  reason: string;
  created_at: string;
}