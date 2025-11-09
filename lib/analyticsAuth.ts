const DEFAULT_ALLOWED_EMAIL = 'rajat82@gmail.com';

export function getAllowedAnalyticsEmails(): string[] {
  const fromEnv = process.env.NOWISH_ANALYTICS_ALLOWED_EMAILS;
  const raw = fromEnv && fromEnv.trim().length > 0 ? fromEnv : DEFAULT_ALLOWED_EMAIL;
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowedForAnalytics(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAllowedAnalyticsEmails().includes(email.trim().toLowerCase());
}

