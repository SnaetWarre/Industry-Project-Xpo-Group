const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const API_CONFIG = {
  baseUrl: BASE_URL,
  endpoints: {
    auth: {
      login: "/api/auth/login",
    },
    analytics: {
      overview: "/api/analytics-dashboard/overview",
      registrationClicks: "/api/analytics-dashboard/registration-clicks",
      exportRegistrationClicks:
        "/api/analytics-dashboard/export/registration-clicks-all.csv",
    },
  },
} as const;
