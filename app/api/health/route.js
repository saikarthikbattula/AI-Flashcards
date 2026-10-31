export function GET() {
  return Response.json({
    status: "ok",
    ai: process.env.GEMINI_API_KEY ? "gemini" : "demo",
  });
}
