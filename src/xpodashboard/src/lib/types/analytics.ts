export interface DashboardOverview {
  registrationClicks: number;
  users: number;
  conversionRate: number;
  avgResponseTimeMs: number;
}

export interface RegistrationClick {
  company: string;
  date: string;
  count: number;
}

export interface ChartData {
  date: string;
  clicks: number;
}
