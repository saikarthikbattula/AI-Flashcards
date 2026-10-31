# Recall

Live app: https://headstarter-flashcards-smoky.vercel.app

A Gemini flashcard application with study review intervals, validated JSON import/export, Clerk accounts, server-only Firestore persistence, and Stripe subscriptions.

## Run

Node 22+: `npm ci`, copy `.env.example` to `.env.local`, then `npm run dev`. No keys are required to try a sample deck and save study progress in this browser. With no Gemini key, generation returns a **sample**, not a summary of pasted notes. `npm test` exercises deck validation, review scheduling, entitlement gating, webhook signature validation, request boundaries, and mocked Gemini transport. `npm run build` verifies production compilation.

## Accounts and cloud decks

Configure both Clerk keys. The proxy enables Clerk middleware only when configured. Set `FIREBASE_PROJECT_ID` plus `FIREBASE_SERVICE_ACCOUNT_JSON` as a server secret, or use GCP application default credentials. Create Firestore; deploy the shared project rules in `firestore.rules`. These allow Firebase-authenticated users to access their own pantry/feedback documents while denying direct client access to Recall decks, billing, and Stripe events. The same Firebase project can serve all three apps; deploying a separate deny-all rules file would break Pantry and Support. Only API routes using verified Clerk sessions access cloud data through the Admin SDK. Users explicitly save and load cloud decks. Browser review progress is local; it does not sync. Signing out does not clear browser decks, so use a trusted device and delete local decks when done.

## Billing

1. Create a recurring Stripe price and set `STRIPE_PRICE_ID`, `STRIPE_SECRET_KEY`, and your canonical `APP_URL`.
2. Enable Stripe's customer portal.
3. Add a webhook at `/api/webhook` for `customer.subscription.created`, `.updated`, and `.deleted`; set its signing secret.
4. Test using Stripe test mode and the Stripe CLI. Real charges are not required for verification.

Free generation allows up to 10 cards. Pro allows up to 30 and is checked server-side against Firestore status plus expiry. A checkout redirect never grants Pro. Signed subscription webhooks retrieve canonical subscription state and atomically write an event receipt and billing snapshot; duplicate events are ignored and older event timestamps do not overwrite newer state. Cloud deck storage is available on either signed-in plan. There is no global generation quota or commercial abuse prevention beyond a per-process request limiter; add shared quotas before selling access.

Firebase Admin read/write and the hosted Clerk sign-in modal were verified. A complete signed-in cloud-deck workflow, checkout, renewals, cancellations, and webhook delivery still need account-backed end-to-end verification. Checkout is intentionally unconfigured at the user’s request. A signed irrelevant-event test is not a full billing certification. Add Stripe test-clock renewal/cancellation and duplicate/out-of-order delivery tests before launch.

## Deploy

Import this repository into Vercel, configure environment variables, deploy, update Clerk domains and Stripe endpoint URLs, and run the above test-mode lifecycle. Public Clerk configuration requires a rebuild. GitHub Actions tests/builds without secrets. A Dockerfile is supplied for independent repository builds; public Clerk keys are build args, private secrets are runtime environment variables.

Gemini: https://ai.google.dev/gemini-api/docs · Clerk: https://clerk.com/docs · Stripe: https://docs.stripe.com/
