import Stripe from "stripe";
import { HttpError } from "./http.js";
import { db } from "./admin.js";
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY)
    throw new HttpError(503, "Billing is not configured.");
  return new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 15000 });
}
export async function isPro(uid) {
  if (!uid || !process.env.FIREBASE_PROJECT_ID) return false;
  const snap = await db().doc(`billing/${uid}`).get();
  return (
    snap.exists &&
    ["active", "trialing"].includes(snap.data().status) &&
    snap.data().expiresAt > Date.now()
  );
}
export function activeSubscription(sub) {
  return ["active", "trialing"].includes(sub.status);
}
