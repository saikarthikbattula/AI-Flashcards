import { guard, failure, HttpError } from "../../../lib/http.js";
import { userId } from "../../../lib/auth.js";
import { stripe, isPro } from "../../../lib/billing.js";
import { db } from "../../../lib/admin.js";
export async function GET() {
  try {
    const uid = await userId();
    return Response.json({ pro: await isPro(uid) });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req) {
  try {
    guard(req);
    const uid = await userId();
    const snap = await db().doc(`billing/${uid}`).get();
    if (!snap.exists || !snap.data().customerId)
      throw new HttpError(404, "No billing account found.");
    if (!process.env.APP_URL)
      throw new HttpError(503, "APP_URL is not configured.");
    const session = await stripe().billingPortal.sessions.create({
      customer: snap.data().customerId,
      return_url: process.env.APP_URL,
    });
    return Response.json({ url: session.url });
  } catch (e) {
    return failure(e);
  }
}
