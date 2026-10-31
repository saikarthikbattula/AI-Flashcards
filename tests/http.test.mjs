import test from "node:test";
import assert from "node:assert/strict";
import { z, readBody, guard, failure } from "../lib/http.js";
test("JSON validation rejects malformed, oversized, and invalid data", async () => {
  const schema = z.object({ name: z.string().min(1) });
  await assert.rejects(
    () =>
      readBody(
        new Request("http://local", { method: "POST", body: "{" }),
        schema,
      ),
    (e) => e.status === 400,
  );
  await assert.rejects(
    () =>
      readBody(
        new Request("http://local", {
          method: "POST",
          body: JSON.stringify({ name: "" }),
        }),
        schema,
      ),
    (e) => e.status === 400,
  );
  await assert.rejects(
    () =>
      readBody(
        new Request("http://local", { method: "POST", body: "x".repeat(50) }),
        schema,
        20,
      ),
    (e) => e.status === 413,
  );
  assert.deepEqual(
    await readBody(
      new Request("http://local", { method: "POST", body: '{"name":"rice"}' }),
      schema,
    ),
    { name: "rice" },
  );
});
test("cross-origin requests fail and internal errors do not leak details", async () => {
  assert.throws(
    () =>
      guard(
        new Request("http://local", {
          headers: { origin: "https://other.example" },
        }),
      ),
    (e) => e.status === 403,
  );
  assert.deepEqual(await failure(new Error("secret credential")).json(), {
    error: "The service could not complete the request. Please try again.",
  });
});

test("accepts a same-origin browser behind URL-rewriting hosting", () => {
  assert.doesNotThrow(() =>
    guard(
      new Request("http://localhost/api", {
        headers: { origin: "http://127.0.0.1:3001", host: "127.0.0.1:3001" },
      }),
    ),
  );
});
