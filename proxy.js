import { clerkMiddleware } from "@clerk/nextjs/server";
export default function proxy(req, event) {
  if (!process.env.CLERK_SECRET_KEY) return;
  return clerkMiddleware()(req, event);
}
export const config = { matcher: ["/", "/api/:path*"] };
