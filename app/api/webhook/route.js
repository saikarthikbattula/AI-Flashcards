import { stripe } from "../../../lib/billing.js";
import { db } from "../../../lib/admin.js";
export async function POST(req) {
  if (!process.env.STRIPE_WEBHOOK_SECRET)
    return Response.json({ error: "Webhook not configured." }, { status: 503 });
  let event;
  try {
    const raw = await req.text();
    if (raw.length > 1000000) return new Response(null, { status: 413 });
    event = stripe().webhooks.constructEvent(
      raw,
      req.headers.get("stripe-signature"),
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return Response.json(
      { error: "Invalid webhook signature." },
      { status: 400 },
    );
  }
  if (
    ![
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
    ].includes(event.type)
  )
    return Response.json({ received: true });
  try {
    const incoming = event.data.object;
    const sub = await stripe().subscriptions.retrieve(incoming.id);
    const uid = sub.metadata.userId;
    if (!uid || !/^user_[A-Za-z0-9]+$/.test(uid))
      return Response.json({ received: true });
    const expiresAt = Math.max(
      0,
      ...sub.items.data.map((i) => (i.current_period_end || 0) * 1000),
    );
    const store = db(),
      receipt = store.doc(`stripeEvents/${event.id}`),
      account = store.doc(`billing/${uid}`);
    await store.runTransaction(async (tx) => {
      const done = await tx.get(receipt);
      if (done.exists) return;
      const existing = await tx.get(account);
      if (
        !existing.exists ||
        (existing.data().eventCreated || 0) <= event.created
      )
        tx.set(account, {
          status: sub.status,
          expiresAt,
          customerId:
            typeof sub.customer === "string" ? sub.customer : sub.customer.id,
          subscriptionId: sub.id,
          eventCreated: event.created,
        });
      tx.set(receipt, { createdAt: Date.now(), type: event.type });
    });
    return Response.json({ received: true });
  } catch {
    return Response.json(
      { error: "Webhook processing failed; retry delivery." },
      { status: 500 },
    );
  }
}
