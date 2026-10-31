import { HttpError } from "./http.js";
export async function userId(required = true) {
  if (!process.env.CLERK_SECRET_KEY) {
    if (required)
      throw new HttpError(
        503,
        "Cloud accounts are not configured. You can still study and save decks in this browser.",
      );
    return null;
  }
  const { auth } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (required && !userId) throw new HttpError(401, "Sign in to continue.");
  return userId;
}
