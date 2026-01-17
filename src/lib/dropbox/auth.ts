import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { signState } from "@/lib/security/state";

type DropboxTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  account_id?: string;
};

export function buildDropboxAuthorizeUrl(orgId: string, redirectUri: string) {
  const clientId = process.env.DROPBOX_APP_KEY;
  if (!clientId) {
    throw new Error("Missing DROPBOX_APP_KEY.");
  }

  const state = signState({ orgId, redirectUri });
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    token_access_type: "offline",
    state,
    redirect_uri: redirectUri,
  });

  return `https://www.dropbox.com/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string, redirectUri: string) {
  const clientId = process.env.DROPBOX_APP_KEY;
  const clientSecret = process.env.DROPBOX_APP_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Dropbox app credentials.");
  }

  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${clientId}:${clientSecret}`
      ).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Dropbox token exchange failed: ${text}`);
  }

  return (await response.json()) as DropboxTokenResponse;
}

export async function refreshDropboxToken(refreshToken: string) {
  const clientId = process.env.DROPBOX_APP_KEY;
  const clientSecret = process.env.DROPBOX_APP_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Dropbox app credentials.");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${clientId}:${clientSecret}`
      ).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Dropbox token refresh failed: ${text}`);
  }

  return (await response.json()) as DropboxTokenResponse;
}

export async function getDropboxAccessToken(orgId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("dropbox_connections")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error("No Dropbox connection found for this org.");
  }

  const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
  const isExpired =
    expiresAt && expiresAt.getTime() <= Date.now() + 60 * 1000;

  if (!isExpired || !data.refresh_token) {
    return {
      accessToken: data.access_token as string,
      connectionId: data.id as string,
    };
  }

  const refreshed = await refreshDropboxToken(data.refresh_token as string);
  const updatedExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

  await supabase
    .from("dropbox_connections")
    .update({
      access_token: refreshed.access_token,
      expires_at: updatedExpiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id);

  return {
    accessToken: refreshed.access_token,
    connectionId: data.id as string,
  };
}
