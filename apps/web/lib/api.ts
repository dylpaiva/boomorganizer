/**
 * Production API boundary. Authenticated requests will be added only after the
 * server-side Supabase JWT verification and application RBAC foundation exist.
 */
export const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
