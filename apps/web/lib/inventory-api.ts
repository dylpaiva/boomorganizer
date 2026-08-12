import { apiBaseUrl } from "./api";
import { getSupabaseClient } from "./supabase";

export type ApiResult = {
  status: number;
  payload: unknown;
};

async function accessToken(): Promise<string> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase configuration is required before inventory commands can be sent.");
  }
  const { data } = await client.auth.getSession();
  if (!data.session?.access_token) {
    throw new Error("Sign in with Supabase before sending inventory commands.");
  }
  return data.session.access_token;
}

export async function inventoryCommand(
  path: string,
  organizationId: string,
  idempotencyKey: string,
  body: Record<string, unknown>,
): Promise<ApiResult> {
  const token = await accessToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
      "X-Organization-ID": organizationId,
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, payload: await response.json() };
}
