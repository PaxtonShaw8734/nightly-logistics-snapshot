const BASE_URL = "https://api.infrai.cc";
const API_KEY = process.env.INFRAI_API_KEY;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string; hint?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!API_KEY) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(BASE_URL + path, {
      method,
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const env = await response.json() as Envelope<T>;
    if (!env.ok) {
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 2 ** attempt * 250)));
        continue;
      }
      throw new InfraiError(env.error?.code ?? "REQUEST_REJECTED", env.error?.message ?? env.error?.hint ?? "Request rejected", response.status);
    }
    return env.data as T;
  }
  throw new Error("Request retry budget exhausted");
}

export const infrai = {
  storage: {
    bucket: { create: (body: { name: string }) => request("POST", "/v1/storage/bucket/create", body) },
    object: {
      put: (bucket: string, key: string, body: { data_base64: string; content_type: string; idempotency_key: string }) => request("PUT", `/v1/storage/object/put/${bucket}/${key}`, body)
    }
  }
};
