import test from "node:test";
import assert from "node:assert/strict";
import { generate } from "../lib/gemini.js";
test("Gemini transport keeps credentials server-side and validates response parsing", async () => {
  const original = globalThis.fetch;
  const old = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-only-key";
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url: String(url), options };
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: { role: "model", parts: [{ text: '{"ok":true}' }] },
            finishReason: "STOP",
          },
        ],
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  };
  try {
    const result = await generate({
      system: "Instructions",
      prompt: "Content",
      schema: { type: "object", properties: { ok: { type: "boolean" } } },
    });
    assert.deepEqual(result, { ok: true });
    assert.match(captured.url, /generativelanguage.googleapis.com/);
    assert.match(captured.options.body, /Instructions/);
    assert.doesNotMatch(captured.options.body, /test-only-key/);
  } finally {
    globalThis.fetch = original;
    if (old === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = old;
  }
});
