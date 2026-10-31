import test from "node:test";
import assert from "node:assert/strict";
import { deckSchema, sampleCards, review } from "../lib/cards.js";
import { POST as generate } from "../app/api/generate/route.js";
import { POST as webhook } from "../app/api/webhook/route.js";
import Stripe from "stripe";
function req(body) {
  return new Request("http://local/api", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
test("deck imports validate shape and review intervals reset after a miss", () => {
  assert.equal(deckSchema.safeParse({ id: "bad", cards: [] }).success, false);
  const first = review({}, "x", true);
  assert.equal(first.x.streak, 1);
  assert.ok(first.x.due > Date.now());
  assert.equal(review(first, "x", false).x.streak, 0);
});
test("demo mode is explicit, input bounded, and Pro requires server entitlement", async () => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.CLERK_SECRET_KEY;
  let r = await generate(
    req({
      notes: "Some sufficiently long notes about software engineering.",
      count: 3,
    }),
  );
  assert.equal(r.status, 200);
  assert.equal((await r.json()).mode, "demo");
  r = await generate(req({ notes: "short", count: 3 }));
  assert.equal(r.status, 400);
  r = await generate(
    req({
      notes: "Some sufficiently long notes about software engineering.",
      count: 30,
    }),
  );
  assert.equal(r.status, 403);
});
test("webhook rejects forged signatures and accepts signed irrelevant events", async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_mock";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_mock";
  const payload = JSON.stringify({
    id: "evt_mock",
    type: "unrelated.event",
    data: { object: {} },
  });
  let r = await webhook(
    new Request("http://local/api/webhook", {
      method: "POST",
      body: payload,
      headers: { "stripe-signature": "forged" },
    }),
  );
  assert.equal(r.status, 400);
  const header = Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET,
  });
  r = await webhook(
    new Request("http://local/api/webhook", {
      method: "POST",
      body: payload,
      headers: { "stripe-signature": header },
    }),
  );
  assert.equal(r.status, 200);
});
