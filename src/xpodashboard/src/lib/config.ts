export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'https://localhost:5001',
  endpoints: {
    auth: {
      login: '/api/auth/login',
    },
    analytics: {
      overview: '/api/analytics-dashboard/overview',
      registrationClicks: '/api/analytics-dashboard/registration-clicks',
      exportRegistrationClicks: '/api/analytics-dashboard/export/registration-clicks-all.csv',
    },
  },
} as const;
