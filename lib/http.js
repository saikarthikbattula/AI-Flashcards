import { z } from "zod";
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export async function readBody(req, schema, max = 32000) {
  const raw = await req.text();
  if (Buffer.byteLength(raw) > max)
    throw new HttpError(413, "Request is too large.");
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Expected valid JSON.");
  }
  const result = schema.safeParse(data);
  if (!result.success)
    throw new HttpError(
      400,
      result.error.issues[0]?.message || "Invalid request.",
    );
  return result.data;
}
export function failure(e) {
  return Response.json(
    {
      error:
        e instanceof HttpError
          ? e.message
          : "The service could not complete the request. Please try again.",
    },
    { status: e instanceof HttpError ? e.status : 502 },
  );
}
// A per-process guard for demos. Use a shared edge rate limiter when deploying multiple instances.
const buckets = new Map();
export function guard(req) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host") || new URL(req.url).host;
  if (origin && (!/^https?:\/\//.test(origin) || new URL(origin).host !== host))
    throw new HttpError(403, "Cross-origin requests are not allowed.");
  const key =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  for (const [k, v] of buckets) if (v.until < now) buckets.delete(k);
  const b = buckets.get(key) || { count: 0, until: now + 60000 };
  if (++b.count > 30)
    throw new HttpError(429, "Please wait a minute before trying again.");
  buckets.set(key, b);
}
export { z };
