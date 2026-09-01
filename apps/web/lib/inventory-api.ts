import { apiBaseUrl } from "./api";
import { getSupabaseClient } from "./supabase";

export type ApiResult = {
  status: number;
  payload: unknown;
};

async function accessToken(): Promise<string> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase configuration is required before PyroLedger can call the API.");
  }
  const { data } = await client.auth.getSession();
  if (!data.session?.access_token) {
    throw new Error("Sign in with Supabase before loading or sending inventory records.");
  }
  return data.session.access_token;
}

async function parsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return { detail: { message: text } };
  }
}

function authorizedHeaders(token: string, organizationId: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "X-Organization-ID": organizationId,
  };
}

export async function inventoryRead(path: string, organizationId: string): Promise<ApiResult> {
  const token = await accessToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "GET",
    headers: authorizedHeaders(token, organizationId),
    cache: "no-store",
  });
  return { status: response.status, payload: await parsePayload(response) };
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
      ...authorizedHeaders(token, organizationId),
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, payload: await parsePayload(response) };
}
