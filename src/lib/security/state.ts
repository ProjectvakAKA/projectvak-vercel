import crypto from "crypto";

type StatePayload = Record<string, unknown>;

export function signState(payload: StatePayload) {
  const secret = process.env.DROPBOX_OAUTH_STATE_SECRET;
  if (!secret) {
    throw new Error("Missing DROPBOX_OAUTH_STATE_SECRET.");
  }

  const data = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("hex");

  return Buffer.from(JSON.stringify({ data, signature })).toString("base64url");
}

export function verifyState(state: string) {
  const secret = process.env.DROPBOX_OAUTH_STATE_SECRET;
  if (!secret) {
    throw new Error("Missing DROPBOX_OAUTH_STATE_SECRET.");
  }

  const decoded = Buffer.from(state, "base64url").toString("utf-8");
  const parsed = JSON.parse(decoded) as { data: string; signature: string };

  const expected = crypto
    .createHmac("sha256", secret)
    .update(parsed.data)
    .digest("hex");

  if (expected !== parsed.signature) {
    throw new Error("Invalid OAuth state signature.");
  }

  return JSON.parse(parsed.data) as StatePayload;
}
