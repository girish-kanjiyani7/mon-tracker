export interface DashboardTransaction {
  id: string;
  name: string;
  merchantName: string | null;
  category: string | null;
  personalCategory: string | null;
  amount: number;
  date: string;
  pending: boolean;
  manual: boolean;
}
