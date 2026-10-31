import { guard, failure, HttpError } from "../../../lib/http.js";
import { userId } from "../../../lib/auth.js";
import { stripe, isPro } from "../../../lib/billing.js";
export async function POST(req) {
  try {
    guard(req);
    const uid = await userId();
    if (await isPro(uid))
      throw new HttpError(
        409,
        "Your subscription is already active. Use Manage billing.",
      );
    if (!process.env.STRIPE_PRICE_ID || !process.env.APP_URL)
      throw new HttpError(503, "Billing needs STRIPE_PRICE_ID and APP_URL.");
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      client_reference_id: uid,
      subscription_data: { metadata: { userId: uid } },
      success_url: `${process.env.APP_URL}/?checkout=success`,
      cancel_url: `${process.env.APP_URL}/?checkout=cancelled`,
      metadata: { userId: uid },
    });
    return Response.json({ url: session.url });
  } catch (e) {
    return failure(e);
  }
}
