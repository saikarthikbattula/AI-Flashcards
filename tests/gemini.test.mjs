import test from "node:test";
import assert from "node:assert/strict";
import { generate } from "../lib/gemini.js";
test("Gemini Interactions transport keeps keys server-side and supports structured image input", async () => {
  const original = globalThis.fetch;
  const old = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-only-key";
  let captured;
  globalThis.fetch = async (request, options) => {
    captured = {
      url: request instanceof Request ? request.url : String(request),
      body:
        options?.body ||
        (request instanceof Request ? await request.clone().text() : ""),
    };
    return new Response(
      JSON.stringify({
        id: "test-interaction",
        status: "completed",
        model: "gemini-3.8-flash",
        steps: [
          {
            type: "model_output",
            content: [{ type: "text", text: '{"ok":true}' }],
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
      image: { mimeType: "image/png", data: "test-image" },
    });
    assert.deepEqual(result, { ok: true });
    assert.match(
      captured.url,
      /generativelanguage.googleapis.com.*interactions/,
    );
    const payload = JSON.parse(captured.body);
    assert.equal(payload.system_instruction, "Instructions");
    assert.equal(payload.store, false);
    assert.equal(payload.response_format.mime_type, "application/json");
    assert.deepEqual(payload.input[1], {
      type: "image",
      mime_type: "image/png",
      data: "test-image",
    });
    assert.doesNotMatch(captured.body, /test-only-key/);
  } finally {
    globalThis.fetch = original;
    if (old === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = old;
  }
});
